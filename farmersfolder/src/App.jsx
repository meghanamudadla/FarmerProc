import { useState, useEffect, useRef, useMemo } from 'react';
import { STR, NOTIF_TEMPLATES } from './i18n/strings.js';
import {
  CROPS, SLOT_TIMES, SLOT_CAPACITY, INITIAL_FARMER_CROPS,
  cropById, centreById, seedSlotBooked, paymentMethodFor, PAY_SEQUENCE, nextPayStage, DEFAULT_RATE,
} from './data/domain.js';
import { queueService } from './services/queueService.js';
import { notificationEngine } from './services/notificationEngine.js';
import { CropRepository } from './services/cropRepository.js';
import { registerFarmer, fetchFarmerMe, updateFarmerMe, fetchMyCrops, fetchMyBookings, createBooking, cancelBooking, fetchSlotsForCenter } from './services/backendData.js';
import { loginFarmer, logoutFarmer, isPhoneRegistered, sendOtpToPhone, verifyOtpCode } from './services/authService.js';
import { fetchRealCentres } from './services/realCentres.js';
import { normalizeRealCrop } from './services/realCrops.js';

// Maps a backend booking status onto the local status vocabulary the UI
// already understands ('booked' | 'waiting' | 'processing' | 'completed' | 'cancelled').
function mapBackendBookingStatus(status) {
  switch (status) {
    case 'booked':
      return 'booked';
    case 'ARRIVED':
      return 'waiting';
    case 'WEIGHING':
    case 'QUALITY_CHECK':
    case 'ACCEPTED':
    case 'PAYMENT_PROCESSING':
      return 'processing';
    case 'PAYMENT_COMPLETED':
      return 'completed';
    case 'REJECTED':
      return 'cancelled';
    default:
      return (status || 'booked').toLowerCase();
  }
}

function normalizeRealBooking(b, cropsById) {
  const crop = cropsById?.[b.crop_id];
  return {
    id: 'bk_' + b.id,
    token: b.token_number,
    farmerId: String(b.farmer_id),
    cropRecordId: crop ? crop.cropRecordId : null,
    cropId: crop ? crop.cropId : null,
    // Real crop names don't live in the local PREDEFINED_CROPS dictionary,
    // so mark these bookings "custom" to make the UI show cropLabel as-is
    // instead of running cropId through that mock lookup.
    cropCustom: true,
    cropLabel: crop ? crop.cropName : 'Produce',
    qty: b.quantity,
    centreId: b.center_id,
    date: b.booking_date,
    slotIdx: null,
    slotId: b.slot_id,
    status: mapBackendBookingStatus(b.status),
    price: b.price,
    paymentStatus: (b.payment_status || 'pending').toLowerCase(),
    paymentMethod: b.payment_method || 'Direct DBT Payout',
    checkedIn: !!b.checked_in,
    arrivalTime: b.arrival_time,
    isRealBooking: true,
    createdTimestamp: b.created_at,
  };
}


import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import BookingDetailModal from './components/BookingDetailModal.jsx';
import RescheduleModal from './components/RescheduleModal.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BookSlot from './pages/BookSlot.jsx';
import Bookings from './pages/Bookings.jsx';
import Queue from './pages/Queue.jsx';
import Payments from './pages/Payments.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import MyCrops from './pages/MyCrops.jsx';
import FindCentres from './pages/FindCentres.jsx';
import Grievances from './pages/Grievances.jsx';
import Receipt from './pages/Receipt.jsx';
import { complaintService } from './services/complaintService.js';
import { offlineSyncService } from './services/offlineSyncService.js';
import SecurityTestModal from './components/SecurityTestModal.jsx';

function formatMobile(v) {
  const digits = v.replace(/\D/g, '').slice(0, 10);
  return digits.length > 5 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;
}

export default function App() {
  const [lang, setLang] = useState('en');
  const t = STR[lang];
  const nt = NOTIF_TEMPLATES[lang];

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('kisanseva_theme');
      if (saved === 'dark') return 'dark';
      // Default to official government white portal theme
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('kisanseva_theme', theme);
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Auth uses sessionStorage and requires a valid backend JWT token:
  // a refresh keeps you logged in, but fresh opening requires database login.
  const [authed, setAuthed] = useState(() => {
    try {
      const stored = sessionStorage.getItem('kisanseva_authed');
      const token = sessionStorage.getItem('access_token');
      return Boolean(stored !== null && JSON.parse(stored) && token);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('kisanseva_authed', JSON.stringify(authed));
    } catch (e) {
      console.warn('Could not persist authed', e);
    }
  }, [authed]);

  // A page reload validates this farmer's real data from the database.
  // If the database does not recognize the farmer, session is invalidated immediately.
  useEffect(() => {
    if (authed) {
      loadRealFarmerData().catch((err) => {
        console.warn('Session verification against database failed:', err);
        logout();
        setAuthErrorMsg(
          lang === 'en'
            ? 'Account not found in the database. Please register first.'
            : 'డేటాబేస్‌లో ఖాతా కనుగొనబడలేదు. దయచేసి ముందుగా నమోదు చేసుకోండి.'
        );
        setAuthMode('signup');
        setSignupStep(1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [role, setRole] = useState('farmer');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState({ name: '', village: '', district: '', landAcres: '', primaryCrop: '', aadhaarLast4: '', farmerId: '' });
  function setSD(patch) {
    setSignupData((d) => ({ ...d, ...patch }));
  }
  const otpRefs = useRef([]);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [dispatchedOtpInfo, setDispatchedOtpInfo] = useState(null);

  // The OTP is the farmer-facing verification step; the backend still requires
  // a password, so we derive one from the phone number rather than asking the
  // farmer to remember/type one. It never appears in the UI.
  function derivedBackendPassword(phoneDigits) {
    return `KS-${phoneDigits}-OTP2026`;
  }

  useEffect(() => {
    if (otpSent) {
      const el = otpRefs.current[0];
      if (el) el.focus();
    }
  }, [otpSent]);

  const [page, setPage] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash.length > 1) return hash;
      const stored = localStorage.getItem('kisanseva_active_page');
      return stored || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kisanseva_active_page', page);
      window.location.hash = page;
    } catch (e) {
      console.warn('Could not persist page state', e);
    }
  }, [page]);

  function logout() {
    setAuthed(false);
    setPage('dashboard');
    try {
      sessionStorage.setItem('kisanseva_authed', JSON.stringify(false));
      localStorage.setItem('kisanseva_active_page', 'dashboard');
      window.location.hash = '';
    } catch (e) {}
  }

  const [farmer, setFarmer] = useState({
    farmerId: 'FRM-10245',
    fullName: 'Ravi Kumar',
    mobile: '+91 8125421544',
    village: 'Kakinada',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    verificationStatus: 'verified',
    accountStatus: 'active',
    // Retained for compatibility with existing logic
    landAcres: '7.5',
    primaryCrop: 'Cotton',
    aadhaarLast4: '4321',
    bankMasked: '•••• •••• 3422',
  });
  // Crops are loaded from the real backend for the authenticated farmer
  // (see loadRealFarmerData), not seeded locally.
  const [crops, setCrops] = useState([]);

  useEffect(() => {
    if (authed) {
      loadRealFarmerData();
    }
  }, [authed]);

  const [profileDraft, setProfileDraft] = useState(farmer);
  const [editingProfile, setEditingProfile] = useState(false);

  // Bookings are loaded from the real backend for the authenticated farmer
  // (see loadRealFarmerData) — no demo/sample bookings are seeded locally.
  const [bookings, setBookings] = useState([]);

  function handleRemoveSampleData() {
    setBookings((prev) => prev.filter((b) => !b.isDemoProcessSample));
  }

  // Cancels a real booking on the backend (releases the reserved crop
  // quantity back to the farmer's quota) and reflects it locally.
  async function handleCancelBooking(booking) {
    if (!booking) return;
    if (!booking.isRealBooking) {
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)));
      return;
    }
    const realId = parseInt(String(booking.id).replace('bk_', ''), 10);
    try {
      await cancelBooking(realId);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)));
      addNotif('sms', lang === 'en' ? `Booking ${booking.token} cancelled. Your crop quota has been restored.` : `బుకింగ్ ${booking.token} రద్దు చేయబడింది. మీ పంట కోటా పునరుద్ధరించబడింది.`);
      // Refresh crops so the restored quantity shows up immediately.
      loadRealFarmerData();
    } catch (err) {
      addNotif('sms', err.message || (lang === 'en' ? 'Could not cancel this booking.' : 'ఈ బుకింగ్‌ను రద్దు చేయలేకపోయాము.'));
    }
  }
  const [slotFill, setSlotFill] = useState({}); // key -> extra bookings made in this session

  const [notifications, setNotifications] = useState([
    {
      id: 'n_grv_1',
      notificationId: 'NOTIF-98214',
      farmerId: 'FRM-10245',
      channel: 'sms',
      text: '⚖️ [Grievance Update] Inspector M. Rao (Legal Metrology) has initiated physical calibration audit for Scale #1 regarding CMP-2026-91042 (Token PDC-84C109).',
      message: '⚖️ [Grievance Update] Inspector M. Rao (Legal Metrology) has initiated physical calibration audit for Scale #1 regarding CMP-2026-91042 (Token PDC-84C109).',
      time: '2 hours ago',
      formattedTime: '05:30 PM',
      status: 'DELIVERED',
    },
    {
      id: 'n_grv_2',
      notificationId: 'NOTIF-98190',
      farmerId: 'FRM-10245',
      channel: 'push',
      text: '✓ [DBT Payout Credited] ₹2,13,600 credited to your APGVB Bank A/C ending with 3422 under grievance CMP-2026-88102 (UTR-98274192847192).',
      message: '✓ [DBT Payout Credited] ₹2,13,600 credited to your APGVB Bank A/C ending with 3422 under grievance CMP-2026-88102 (UTR-98274192847192).',
      time: '1 day ago',
      formattedTime: '04:15 PM',
      status: 'DELIVERED',
    },
    {
      id: 'n_grv_3',
      notificationId: 'NOTIF-98150',
      farmerId: 'FRM-10245',
      channel: 'sms',
      text: '🧪 [QC Assigned] Sealed crop sample for Token PDC-71B420 has been dispatched to District Agricultural QC Laboratory (Officer S. Varma).',
      message: '🧪 [QC Assigned] Sealed crop sample for Token PDC-71B420 has been dispatched to District Agricultural QC Laboratory (Officer S. Varma).',
      time: '1 day ago',
      formattedTime: '12:15 PM',
      status: 'DELIVERED',
    },
    {
      id: 'n_grv_4',
      notificationId: 'NOTIF-98100',
      farmerId: 'FRM-10245',
      channel: 'ivr',
      text: '☎️ [Mandi Officer Voice Call] Automated briefing: Your grievance CMP-2026-91042 is under active investigation by the Mandi Superintendent.',
      message: '☎️ [Mandi Officer Voice Call] Automated briefing: Your grievance CMP-2026-91042 is under active investigation by the Mandi Superintendent.',
      time: '2 days ago',
      formattedTime: '11:00 AM',
      status: 'DELIVERED',
    },
  ]);
  const [complaints, setComplaints] = useState(() => complaintService.complaints);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const [activeBookingId, setActiveBookingId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changingNumber, setChangingNumber] = useState(false);
  const [newMobileDraft, setNewMobileDraft] = useState('');
  const [detailBookingId, setDetailBookingId] = useState(null);
  const [queueTick, setQueueTick] = useState(0);
  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlotIdx, setRescheduleSlotIdx] = useState(null);

  const [receiptBooking, setReceiptBooking] = useState(null);
  const [grievancePrefillToken, setGrievancePrefillToken] = useState(null);

  function handleOpenReceipt(b) {
    setReceiptBooking(b);
    setPage('receipt');
  }

  function handleOpenGrievance(token) {
    setGrievancePrefillToken(token || null);
    setPage('grievances');
  }

  // booking form state
  const [form, setForm] = useState({ cropText: CROPS[0].en, qty: '', centreId: 'c1', date: '2026-09-10', slotIdx: null });
  function findCrop(text) {
    const t2 = (text || '').trim().toLowerCase();
    if (!t2) return null;
    return CROPS.find((c) => c.en.toLowerCase() === t2 || c.te === text.trim()) || null;
  }
  const [bookStep, setBookStep] = useState(1);
  const [bank, setBank] = useState({ holder: '', bankName: '', acc: '', confirmAcc: '', ifsc: '' });

  function addNotif(channel, text, event = 'IN_APP_ALERT', payload = {}) {
    const timeStr = lang === 'en' ? 'just now' : 'ఇప్పుడే';
    const newRecord = {
      id: 'n' + Date.now() + Math.random(),
      notificationId: 'NOTIF-' + Date.now(),
      farmerId: farmer.farmerId,
      channel: channel || 'sms',
      text,
      message: text,
      status: 'DELIVERED',
      time: timeStr,
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications((prev) => [newRecord, ...prev]);
  }

  function bookingCropLabel(b) {
    if (!b) return '';
    if (b.cropCustom && b.cropLabel) return b.cropLabel;
    const crop = cropById(b.cropId);
    return crop?.[lang] || crop?.en || b.cropLabel || b.cropId || 'Produce';
  }
  const matchedCrop = findCrop(form.cropText);
  const selectedCropRecord = useMemo(() => {
    if (!crops || crops.length === 0) return null;
    if (form.cropRecordId) {
      return crops.find((c) => c.cropRecordId === form.cropRecordId) || null;
    }
    return (
      crops.find((c) => form.cropId && c.cropId === form.cropId) ||
      crops.find((c) => form.cropText && c.cropName === form.cropText) ||
      crops[0]
    );
  }, [crops, form.cropRecordId, form.cropId, form.cropText]);

  const eligibleQty = useMemo(() => {
    if (selectedCropRecord) {
      return selectedCropRecord.remainingQuantity != null
        ? selectedCropRecord.remainingQuantity
        : selectedCropRecord.entitlementQuantity;
    }
    const acres = parseFloat(farmer.landAcres);
    if (!acres || !matchedCrop) return null;
    return Math.round(acres * matchedCrop.yieldPerAcre);
  }, [selectedCropRecord, farmer.landAcres, matchedCrop]);

  function slotKey(centreId, date, idx) {
    return centreId + '|' + date + '|' + idx;
  }
  function bookedCount(centreId, date, idx) {
    return seedSlotBooked(centreId, date, idx) + (slotFill[slotKey(centreId, date, idx)] || 0);
  }
  function spotsLeft(centreId, date, idx) {
    return Math.max(0, SLOT_CAPACITY - bookedCount(centreId, date, idx));
  }

  function handleOtpChange(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < otp.length - 1) {
      const el = otpRefs.current[i + 1];
      if (el) el.focus();
    }
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (!otp[i] && i > 0) {
        const el = otpRefs.current[i - 1];
        if (el) el.focus();
        const next = [...otp];
        next[i - 1] = '';
        setOtp(next);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      const el = otpRefs.current[i - 1];
      if (el) el.focus();
    } else if (e.key === 'ArrowRight' && i < otp.length - 1) {
      const el = otpRefs.current[i + 1];
      if (el) el.focus();
    }
  }

  function handleOtpPaste(e) {
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, otp.length);
    if (!digits) return;
    e.preventDefault();
    const next = digits.split('');
    while (next.length < otp.length) next.push('');
    setOtp(next);
    const lastIdx = Math.min(digits.length, otp.length) - 1;
    const el = otpRefs.current[lastIdx >= 0 ? lastIdx : 0];
    if (el) el.focus();
  }

  // Gate OTP entry on the real database: sign-in only proceeds for a number
  // that already exists in the database. If not found, redirect to register first!
  async function sendOtpChecked() {
    setAuthErrorMsg('');
    const phoneDigits = mobile.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setAuthErrorMsg(
        lang === 'en'
          ? 'Please enter a valid 10-digit mobile number.'
          : 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.'
      );
      return;
    }

    setAuthBusy(true);
    try {
      // 1. Check Aiven PostgreSQL database
      const registered = await isPhoneRegistered(phoneDigits);

      if (authMode === 'signin' && !registered) {
        // Farmer does NOT exist in the database -> BLOCK access and redirect to Register
        setAuthErrorMsg(
          lang === 'en'
            ? `Mobile number +91 ${phoneDigits} is not registered in the database. Please register first to access your dashboard.`
            : `మొబైల్ నంబర్ +91 ${phoneDigits} డేటాబేస్‌లో నమోదు కాలేదు. డ్యాష్‌బోర్డ్‌ను యాక్సెస్ చేయడానికి దయచేసి ముందుగా నమోదు చేసుకోండి.`
        );
        setAuthMode('signup');
        setSignupStep(1);
        return;
      }

      if (authMode === 'signup' && registered) {
        setAuthErrorMsg(
          lang === 'en'
            ? `Mobile number +91 ${phoneDigits} is already registered in the database. Please sign in to open your dashboard.`
            : `మొబైల్ నంబర్ +91 ${phoneDigits} ఇప్పటికే డేటాబేస్‌లో ఉంది. డ్యాష్‌బోర్డ్ తెరవడానికి దయచేసి సైన్ ఇన్ చేయండి.`
        );
        setAuthMode('signin');
        return;
      }

      // 2. Dispatch real OTP to the registered phone number via backend OTP service
      const res = await sendOtpToPhone(phoneDigits, {
        forLogin: authMode === 'signin',
        forSignup: authMode === 'signup',
      });

      setOtpSent(true);
      setDispatchedOtpInfo({
        otp: res.otp,
        smsDelivered: res.sms_delivered,
        provider: res.provider,
        phone: phoneDigits,
      });

      if (res.sms_delivered) {
        addNotif(
          'sms',
          lang === 'en'
            ? `📲 SMS OTP delivered to registered mobile +91 ${phoneDigits} via ${res.provider}.`
            : `📲 మీ నమోదిత మొబైల్ +91 ${phoneDigits}కు SMS OTP పంపబడింది.`
        );
      } else {
        addNotif(
          'sms',
          lang === 'en'
            ? `📲 OTP dispatched to registered phone +91 ${phoneDigits}: Code is ${res.otp}`
            : `📲 నమోదిత ఫోన్ +91 ${phoneDigits}కు OTP పంపబడింది: కోడ్ ${res.otp}`
        );
      }
    } catch (err) {
      setAuthErrorMsg(err.message || (lang === 'en' ? 'Could not connect to database to verify this number. Please try again.' : 'డేటాబేస్‌ను తనిఖీ చేయలేకపోయాము. మళ్ళీ ప్రయత్నించండి.'));
    } finally {
      setAuthBusy(false);
    }
  }

  // Validates this farmer's real data from the Aiven database.
  // If no record exists in the database, this throws to strictly prevent dashboard access.
  async function loadRealFarmerData() {
    const profile = await fetchFarmerMe();
    if (!profile || !profile.id) {
      throw new Error(
        lang === 'en'
          ? 'Farmer profile not found in database. Please register first.'
          : 'డేటాబేస్‌లో రైతు ప్రొఫైల్ కనుగొనబడలేదు. దయచేసి ముందుగా నమోదు చేసుకోండి.'
      );
    }

    const [rawCrops, rawBookings] = await Promise.all([
      fetchMyCrops().catch(() => []),
      fetchMyBookings().catch(() => []),
      fetchRealCentres().catch(() => []),
    ]);

    const resolvedFarmerId = profile.farmer_id || farmer.farmerId;
    const cropList = Array.isArray(rawCrops) ? rawCrops : [];
    const normalizedCrops = cropList.map((c) => ({ ...normalizeRealCrop(c), farmerId: resolvedFarmerId }));
    const cropsById = {};
    cropList.forEach((c, i) => {
      cropsById[c.id] = normalizedCrops[i];
    });

    setCrops(normalizedCrops);
    setBookings(
      (Array.isArray(rawBookings) ? rawBookings : []).map((b) => ({
        ...normalizeRealBooking(b, cropsById),
        farmerId: resolvedFarmerId,
      }))
    );

    setFarmer((f) => ({
      ...f,
      farmerId: profile.farmer_id || f.farmerId,
      fullName: profile.name || f.fullName,
      village: profile.village || f.village,
      district: profile.district || f.district,
      date_of_birth: profile.date_of_birth || null,
      landAcres: profile.land_area != null ? String(profile.land_area) : f.landAcres,
      mobile: profile.phone ? '+91 ' + profile.phone : f.mobile,
    }));

    return profile;
  }

  // Farmer login verifies with the Aiven database.
  // If farmer is in database -> opens dashboard.
  // If not in database -> rejects and redirects to registration.
  async function login() {
    setAuthErrorMsg('');

    const enteredOtp = otp.join('').trim();
    if (enteredOtp.length !== 6) {
      setAuthErrorMsg(
        lang === 'en'
          ? 'Please enter the complete 6-digit OTP sent to your registered phone.'
          : 'దయచేసి మీ నమోదిత ఫోన్‌కు పంపిన పూర్తి 6 అంకెల OTPని నమోదు చేయండి.'
      );
      return;
    }

    setAuthBusy(true);
    const phoneDigits = mobile.replace(/\D/g, '');
    const backendPassword = derivedBackendPassword(phoneDigits);

    try {
      // 1. Verify entered OTP with the backend OTP engine
      await verifyOtpCode(phoneDigits, enteredOtp);
      if (authMode === 'signup') {
        await registerFarmer({
          name: signupData.name.trim(),
          phone: phoneDigits,
          password: backendPassword,
          village: signupData.village,
          district: signupData.district,
          land_area: signupData.landAcres ? parseFloat(signupData.landAcres) : null,
        });
      }

      // Check database credentials and authenticate
      await loginFarmer(phoneDigits, backendPassword);

      // Verify farmer profile exists in database before allowing dashboard access
      await loadRealFarmerData();

      if (authMode === 'signup' && signupData.name.trim()) {
        setFarmer((f) => ({
          ...f,
          fullName: signupData.name.trim(),
          mobile: '+91 ' + mobile,
          village: signupData.village,
          district: signupData.district,
          landAcres: signupData.landAcres,
          primaryCrop: signupData.primaryCrop,
          aadhaarLast4: signupData.aadhaarLast4,
          farmerId: signupData.farmerId,
        }));
      }

      // Allow to open dashboard
      setAuthed(true);
      try {
        sessionStorage.setItem('kisanseva_authed', JSON.stringify(true));
      } catch (e) {}

      const first = (authMode === 'signup' && signupData.name.trim() ? signupData.name.trim() : farmer.fullName).split(' ')[0];
      addNotif('sms', lang === 'en' ? `Welcome${authMode === 'signup' ? '' : ' back'}, ${first}.` : `${authMode === 'signup' ? '' : 'మళ్ళీ '}స్వాగతం, ${first}.`);
      if (authMode === 'signup') {
        addNotif('push', lang === 'en' ? 'Registration complete and saved in database. Your eligible quantity has been calculated from your land details.' : 'నమోదు పూర్తయింది మరియు డేటాబేస్‌లో భద్రపరచబడింది.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      const msg = (err.message || '').toLowerCase();
      const notFound = msg.includes('not found') || msg.includes('404') || msg.includes('not registered') || msg.includes('invalid phone');

      if (notFound && authMode === 'signin') {
        setAuthErrorMsg(
          lang === 'en'
            ? 'Account not found in the database. Please register first to access the dashboard.'
            : 'డేటాబేస్‌లో ఖాతా కనుగొనబడలేదు. డ్యాష్‌బోర్డ్ తెరవడానికి దయచేసి ముందుగా నమోదు చేసుకోండి.'
        );
        setOtpSent(false);
        setOtp(['', '', '', '', '', '']);
        setAuthMode('signup');
        setSignupStep(1);
      } else {
        setAuthErrorMsg(
          err.message ||
            (lang === 'en' ? 'Could not verify login in database. Please try again.' : 'డేటాబేస్‌లో లాగిన్ ధృవీకరణ విఫలమైంది. మళ్ళీ ప్రయత్నించండి.')
        );
      }
    } finally {
      setAuthBusy(false);
    }
  }

  function simulateArrival(bookingId) {
    const now = new Date().toLocaleTimeString(lang === 'en' ? 'en-IN' : 'te-IN', { hour: '2-digit', minute: '2-digit' });
    setBookings((bs) => bs.map((b) => (b.id === bookingId ? { ...b, checkedIn: true, arrivalTime: now } : b)));
    addNotif('sms', lang === 'en' ? 'You have been checked in at the centre gate. Please proceed to the queue.' : 'మీరు కేంద్రం గేటు వద్ద చెక్-ఇన్ చేయబడ్డారు. దయచేసి క్యూకి వెళ్లండి.');
  }

  function saveNewMobile() {
    const digits = newMobileDraft.replace(/\D/g, '');
    if (digits.length !== 10) return;
    setFarmer((f) => ({ ...f, mobile: '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5) }));
    setChangingNumber(false);
    setNewMobileDraft('');
    addNotif('sms', lang === 'en' ? 'Your registered mobile number has been updated.' : 'మీ నమోదిత మొబైల్ నంబర్ నవీకరించబడింది.');
  }

  function logout() {
    logoutFarmer();
    setAuthed(false);
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setMobile('');
    setAuthMode('signin');
    setSignupStep(1);
    setPage('dashboard');
    // Clear this farmer's data so it never leaks into the next login on this device.
    setCrops([]);
    setBookings([]);
  }

  const qtyNum = parseFloat(form.qty);
  const overLimit = eligibleQty != null && qtyNum > eligibleQty;
  const profileComplete = !!farmer.landAcres;

  // Real live booking flow (from BookSlot's Step 4) calls the actual backend
  // and passes {centerId, cropId, quantity, bookingDate, slotId, ...}
  async function confirmBooking(processedBooking) {
    const created = await createBooking({
      center_id: processedBooking.centerId,
      crop_id: processedBooking.cropId,
      quantity: processedBooking.quantity,
      booking_date: processedBooking.bookingDate,
      slot_id: processedBooking.slotId,
    });

    const cropsById = {};
    crops.forEach((c) => {
      if (c.backendCropId != null) cropsById[c.backendCropId] = c;
    });
    const normalized = { ...normalizeRealBooking(created, cropsById), farmerId: farmer.farmerId };
    const centre = centreById(processedBooking.centerId);

    setBookings((prev) => [normalized, ...prev]);
    setActiveBookingId(normalized.id);
    addNotif('sms', nt.booked(normalized.token, normalized.date, processedBooking.slotLabel || '', centre[lang] || centre.en));
    addNotif('ivr', nt.ivrNote);
    addNotif('push', nt.payInit((normalized.price || 0).toLocaleString('en-IN'), normalized.paymentMethod));

    setBookStep(1);
    setForm({ cropText: CROPS[0].en, qty: '', centreId: null, date: new Date().toISOString().slice(0, 10), slotId: null });
    setBank({ holder: '', bankName: '', acc: '', confirmAcc: '', ifsc: '' });
    setPage('bookings');
  }

  // Authoritative procurement completion handler (Sections 14, 15, 22, 23)
  function completeProcurement(bookingId) {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;

    setBookings((bs) =>
      bs.map((b) => (b.id === bookingId ? { ...b, status: 'completed', paymentStatus: 'credited' } : b))
    );

    const res = CropRepository.recordProcurementCompletion({
      farmerId: farmer.farmerId,
      cropId: targetBooking.cropId,
      cropRecordId: targetBooking.cropRecordId,
      procuredQty: targetBooking.qty,
      bookingId: targetBooking.id,
    });

    if (res.success) {
      setCrops(CropRepository.getCropsForFarmer(farmer.farmerId));
      if (res.isCompleted) {
        addNotif(
          'sms',
          lang === 'en'
            ? `✓ Government Procurement for ${res.crop.cropName} is fully completed (80/80 Qtl). Status: COMPLETED.`
            : `✓ ${res.crop.cropName} కోసం ప్రభుత్వ సేకరణ పూర్తిగా పూర్తయింది. స్థితి: పూర్తయింది.`
        );
      } else {
        addNotif(
          'sms',
          lang === 'en'
            ? `Weighing finalized: +${targetBooking.qty} Qtl for ${res.crop.cropName}. Remaining quota: ${res.crop.remainingQuantity} Qtl.`
            : `తూకం ఖరారు చేయబడింది: +${targetBooking.qty} క్వి ${res.crop.cropName}. మిగిలిన కోటా: ${res.crop.remainingQuantity} క్వి.`
        );
      }
    }
  }

  const activeBooking =
    bookings.find((b) => b.id === activeBookingId) ||
    bookings.find(
      (b) =>
        b.status === 'booked' ||
        b.status === 'checked_in' ||
        b.status === 'waiting' ||
        b.status === 'called' ||
        b.status === 'processing'
    ) ||
    null;
  const previousBookings = bookings.filter((b) => !activeBooking || b.id !== activeBooking.id);
  const detailBooking = bookings.find((b) => b.id === detailBookingId);
  const rescheduleBooking = bookings.find((b) => b.id === rescheduleBookingId);

  function openReschedule(b) {
    setRescheduleBookingId(b.id);
    setRescheduleDate(b.date);
    setRescheduleSlotIdx(null);
  }
  function confirmReschedule() {
    if (!rescheduleBooking || rescheduleSlotIdx == null) return;
    const oldKey = slotKey(rescheduleBooking.centreId, rescheduleBooking.date, rescheduleBooking.slotIdx);
    const newKey = slotKey(rescheduleBooking.centreId, rescheduleDate, rescheduleSlotIdx);
    setSlotFill((prev) => {
      const next = { ...prev };
      next[oldKey] = Math.max(0, (next[oldKey] || 0) - 1);
      next[newKey] = (next[newKey] || 0) + 1;
      return next;
    });
    setBookings((bs) => bs.map((b) => (b.id === rescheduleBooking.id ? { ...b, date: rescheduleDate, slotIdx: rescheduleSlotIdx } : b)));
    addNotif('sms', nt.booked(rescheduleBooking.token, rescheduleDate, SLOT_TIMES[rescheduleSlotIdx], centreById(rescheduleBooking.centreId)[lang]));
    addNotif(
      'push',
      lang === 'en'
        ? `Your slot for ${rescheduleBooking.token} has been moved to ${rescheduleDate}, ${SLOT_TIMES[rescheduleSlotIdx]}.`
        : `${rescheduleBooking.token} స్లాట్ ${rescheduleDate}, ${SLOT_TIMES[rescheduleSlotIdx]}కి మార్చబడింది.`
    );
    setRescheduleBookingId(null);
  }

  function cancelActiveBooking() {
    setBookings((bs) => bs.map((b) => (b.id === activeBooking.id ? { ...b, status: 'cancelled' } : b)));
    setActiveBookingId(null);
  }

  function handleUpdateBookingStatus(updatedBooking) {
    setBookings((bs) => bs.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)));
    if (updatedBooking.status === 'called') {
      addNotif('sms', lang === 'en' ? `🚨 Your token ${updatedBooking.token} is CALLED! Proceed to Counter #${updatedBooking.counterNumber || 1}.` : `🚨 మీ టోకెన్ ${updatedBooking.token} పిలవబడింది! దయచేసి కౌంటర్ #${updatedBooking.counterNumber || 1} వద్దకు వెళ్లండి.`);
    } else if (updatedBooking.status === 'no_show') {
      addNotif('sms', lang === 'en' ? `⚠️ Token ${updatedBooking.token} marked No-Show. Please speak with Mandi Officer.` : `⚠️ టోకెన్ ${updatedBooking.token} హాజరు కాలేదని మార్క్ చేయబడింది.`);
    }
  }

  function handleResetQueueData(newMockData) {
    const originalBooking = bookings.find((b) => b.isOriginalUserBooking || b.token === 'PDC-62F388');
    const existing = originalBooking ? [originalBooking] : [];
    setBookings([...existing, ...newMockData]);
    addNotif(
      'sms',
      lang === 'en'
        ? '⚡ Loaded diverse Mandi queue mock data across all 5 procurement stages!'
        : '⚡ అన్ని 5 దశల్లో మండి క్యూ నమూనా డేటా లోడ్ చేయబడింది!'
    );
  }

  useEffect(() => {
    if (page !== 'queue' && page !== 'dashboard') return;
    const iv = setInterval(() => setQueueTick((x) => x + 1), 4000);
    return () => clearInterval(iv);
  }, [page]);

  const peopleAhead = activeBooking ? Math.max(0, 3 - queueTick) : 0;
  const estWaitMin = peopleAhead * 7;

  useEffect(() => {
    if (activeBooking && peopleAhead === 1) {
      addNotif('sms', nt.approaching(activeBooking.token, peopleAhead));
    }
    // eslint-disable-next-line
  }, [peopleAhead]);

  // Payment status is system-driven, not farmer-controlled: it advances on its own,
  // simulating the bank pipeline (Initiated → Verified → Processing → Credited).
  useEffect(() => {
    const iv = setInterval(() => {
      setBookings((bs) => bs.map((b) => (b.status === 'booked' && PAY_SEQUENCE.includes(b.paymentStatus) ? { ...b, paymentStatus: nextPayStage(b.paymentStatus) } : b)));
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const creditedNotified = useRef(new Set());
  useEffect(() => {
    if (activeBooking && activeBooking.paymentStatus === 'credited' && !creditedNotified.current.has(activeBooking.id)) {
      creditedNotified.current.add(activeBooking.id);
      addNotif('sms', nt.payDone(activeBooking.price.toLocaleString('en-IN')));
    }
    // eslint-disable-next-line
  }, [activeBooking && activeBooking.paymentStatus]);

  async function saveProfile() {
    try {
      const updated = await updateFarmerMe({
        date_of_birth: profileDraft.date_of_birth || null,
        village: profileDraft.village || null,
        district: profileDraft.district || null,
      });
      setFarmer((f) => ({
        ...f,
        village: updated.village || f.village,
        district: updated.district || f.district,
        date_of_birth: updated.date_of_birth || null,
      }));
      setEditingProfile(false);
      addNotif('push', lang === 'en' ? 'Profile updated. Your eligible quantity has been recalculated.' : 'ప్రొఫైల్ నవీకరించబడింది. మీ అర్హత పరిమాణం మళ్ళీ లెక్కించబడింది.');
    } catch (err) {
      addNotif('sms', lang === 'en' ? `Failed to update profile: ${err.message}` : `విఫలమైంది: ${err.message}`);
    }
  }

  const totalValue = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? (parseFloat(b.price) || 0) : 0), 0);
  const paidValue = bookings.reduce((s, b) => s + ((b.paymentStatus === 'credited' || b.paymentStatus === 'completed') ? (parseFloat(b.price) || 0) : 0), 0);
  const pendingValue = Math.max(0, totalValue - paidValue);

  /* ---------------- LOGIN SCREEN ---------------- */
  if (!authed) {
    return (
      <Login
        t={t}
        lang={lang}
        setLang={setLang}
        role={role}
        setRole={setRole}
        authMode={authMode}
        setAuthMode={setAuthMode}
        signupStep={signupStep}
        setSignupStep={setSignupStep}
        signupData={signupData}
        setSD={setSD}
        mobile={mobile}
        setMobile={setMobile}
        formatMobile={formatMobile}
        otpSent={otpSent}
        setOtpSent={setOtpSent}
        otp={otp}
        setOtp={setOtp}
        otpRefs={otpRefs}
        handleOtpChange={handleOtpChange}
        handleOtpKeyDown={handleOtpKeyDown}
        handleOtpPaste={handleOtpPaste}
        login={login}
        addNotif={addNotif}
        authBusy={authBusy}
        authErrorMsg={authErrorMsg}
        onSendOtp={sendOtpChecked}
        onResendOtp={sendOtpChecked}
        dispatchedOtpInfo={dispatchedOtpInfo}
      />
    );
  }

  function handleSetLang(newLang) {
    setLang(newLang);
    setFarmer((f) => ({ ...f, preferredLanguage: newLang }));
  }

  function handleTriggerOfflineSync() {
    offlineSyncService.syncPendingQueue(async (item) => {
      if (item.type === 'BOOKING_REQUEST') {
        const bk = item.payload.backendData;
        try {
          // Native atomic capacity server check execution
          const created = await createBooking(bk);

          const cropsById = {};
          crops.forEach((c) => {
            if (c.backendCropId != null) cropsById[c.backendCropId] = c;
          });
          const normalized = { ...normalizeRealBooking(created, cropsById), farmerId: farmer.farmerId };

          setBookings((prev) => [normalized, ...prev]);
          addNotif('sms', lang === 'en' ? `Re-sync complete: Token ${normalized.token} confirmed at your original slot!` : `సింక్ పూర్తయింది: టోకెన్ ${normalized.token} నిర్ధారించబడింది!`);
          return true; // Resolves sync queue
        } catch (err) {
          if (err.message && err.message.toLowerCase().includes("slot is full")) {
            // Find another alternative slot natively
            const availableSlots = await fetchSlotsForCenter(bk.center_id);
            const slotCandidates = availableSlots.filter(s => s.date >= bk.booking_date && s.available_capacity > 0);
            
            if (slotCandidates.length > 0) {
                const nextSlot = slotCandidates[0];
                const fallbackCreated = await createBooking({
                   ...bk,
                   booking_date: nextSlot.date,
                   slot_id: nextSlot.id
                });
                
                const cropsById = {};
                crops.forEach((c) => {
                  if (c.backendCropId != null) cropsById[c.backendCropId] = c;
                });
                const normalized = { ...normalizeRealBooking(fallbackCreated, cropsById), farmerId: farmer.farmerId };
                
                setBookings((prev) => [normalized, ...prev]);
                addNotif('sms', lang === 'en' ? `Re-sync complete: Your original slot filled up - you're now booked for ${nextSlot.date} at ${(nextSlot.start_time || '').slice(0,5)}.` : `సింక్ పూర్తయింది: మీ అసలైన స్లాట్ నిండిపోయింది - మీరు ఇప్పుడు ${nextSlot.date} కోసం బుక్ చేయబడ్డారు.`);
                return true; 
            } else {
                addNotif('sms', lang === 'en' ? `Offline booking failed: No alternative slots available at this centre.` : `ఆఫ్‌లైన్ బుకింగ్ విఫలమైంది.`);
                throw new Error("No alternative slots"); // Let loop catch and flag failed
            }
          } else {
            addNotif('sms', lang === 'en' ? `Offline booking failed: ${err.message}` : `ఆఫ్‌లైన్ బుకింగ్ విఫలమైంది.`);
            throw err;
          }
        }
      }
    });
  }

  /* ---------------- MAIN APP ---------------- */
  return (
    <div className="gov-portal-wrapper">
      {/* Official Government of India Header Ribbon */}
      <header className="gov-tricolor-banner">
        <div className="gov-tricolor-line"></div>
        <div className="gov-banner-content">
          <div className="gov-banner-left">
            <span className="gov-flag-emblem">🇮🇳</span>
            <span className="gov-banner-title-hi">भारत सरकार</span>
            <span className="gov-sep">|</span>
            <span className="gov-banner-title-en">Government of India</span>
            <span className="gov-sep">•</span>
            <span>कृषि एवं किसान कल्याण मंत्रालय | Ministry of Agriculture & Farmers Welfare</span>
          </div>
          <div className="gov-banner-right">
            <span className="gov-portal-tag">AgriStack • KISAN Mandi Queue Portal</span>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <Sidebar t={t} lang={lang} setLang={handleSetLang} page={page} setPage={setPage} setBookStep={setBookStep} logout={logout} theme={theme} toggleTheme={toggleTheme} />

        <main className="main">
        <TopBar
          t={t}
          lang={lang}
          page={page}
          farmer={farmer}
          role={role}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          changingNumber={changingNumber}
          setChangingNumber={setChangingNumber}
          newMobileDraft={newMobileDraft}
          setNewMobileDraft={setNewMobileDraft}
          formatMobile={formatMobile}
          saveNewMobile={saveNewMobile}
          setPage={setPage}
          logout={logout}
          onOpenSecurityTests={() => setIsSecurityModalOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {page === 'dashboard' && (
          <Dashboard
            t={t}
            lang={lang}
            activeBooking={activeBooking}
            peopleAhead={peopleAhead}
            estWaitMin={estWaitMin}
            previousBookings={previousBookings}
            setPage={setPage}
            setDetailBookingId={setDetailBookingId}
            bookingCropLabel={bookingCropLabel}
            totalValue={totalValue}
            paidValue={paidValue}
            pendingValue={pendingValue}
            crops={crops}
            farmer={farmer}
          />
        )}

        {page === 'findCentres' && (
          <FindCentres
            t={t}
            lang={lang}
            farmer={farmer}
            onSelectCentreForBooking={(centre) => {
              setForm({ ...form, centreId: centre.id });
              setPage('book');
              setBookStep(1);
            }}
          />
        )}

        {page === 'myCrops' && (
          <MyCrops
            t={t}
            lang={lang}
            farmer={farmer}
            crops={crops}
            setCrops={setCrops}
            bookings={bookings}
            onBookSlotForCrop={(c) => {
              setForm({
                ...form,
                cropRecordId: c.cropRecordId,
                cropId: c.cropId,
                cropText: c.cropName,
                qty: '',
              });
              setPage('book');
              setBookStep(1);
            }}
          />
        )}

        {page === 'book' && (
          <BookSlot
            t={t}
            lang={lang}
            profileComplete={profileComplete}
            setPage={setPage}
            bookStep={bookStep}
            setBookStep={setBookStep}
            form={form}
            setForm={setForm}
            matchedCrop={matchedCrop}
            eligibleQty={eligibleQty}
            overLimit={overLimit}
            farmer={farmer}
            crops={crops}
            bookings={bookings}
            spotsLeft={spotsLeft}
            bank={bank}
            setBank={setBank}
            confirmBooking={confirmBooking}
          />
        )}

        {page === 'receipt' && (
          <Receipt
            t={t}
            lang={lang}
            booking={receiptBooking || bookings.find((b) => b.status === 'completed') || bookings[0]}
            farmer={farmer}
            onBack={() => setPage('bookings')}
            onRaiseGrievance={(token) => handleOpenGrievance(token)}
          />
        )}

        {page === 'bookings' && (
          <Bookings
            t={t}
            lang={lang}
            bookings={bookings}
            farmer={farmer}
            setDetailBookingId={setDetailBookingId}
            bookingCropLabel={bookingCropLabel}
            setPage={setPage}
            onRemoveSampleData={handleRemoveSampleData}
            onOpenReceipt={handleOpenReceipt}
            onOpenGrievance={handleOpenGrievance}
            onCancelBooking={handleCancelBooking}
            onAddComplaint={(newComp) => {
              setComplaints((prev) => [newComp, ...prev]);
              addNotif('sms', lang === 'en' ? `Grievance ${newComp.complaintId} submitted to Mandi Cell.` : `ఫిర్యాదు ${newComp.complaintId} మండి విభాగానికి సమర్పించబడింది.`);
            }}
          />
        )}

        {page === 'queue' && (
          <Queue
            t={t}
            lang={lang}
            farmer={farmer}
            bookings={bookings}
            activeBooking={activeBooking}
            peopleAhead={peopleAhead}
            estWaitMin={estWaitMin}
            queueTick={queueTick}
            bookingCropLabel={bookingCropLabel}
            openReschedule={openReschedule}
            cancelActiveBooking={cancelActiveBooking}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onResetQueueData={handleResetQueueData}
            onCheckInSuccess={(bId, arrivalTime) => {
              setBookings((bs) => bs.map((b) => (b.id === bId ? { ...b, checkedIn: true, arrivalTime: arrivalTime || '09:30 AM', status: 'checked_in' } : b)));
              addNotif('sms', lang === 'en' ? 'Gate check-in verified. Queue entry created.' : 'గేట్ చెక్-ఇన్ ధృవీకరించబడింది. క్యూ నమోదు సృష్టించబడింది.');
            }}
          />
        )}

        {page === 'payments' && (
          <Payments
            t={t}
            lang={lang}
            activeBooking={activeBooking}
            bookings={bookings}
            totalValue={totalValue}
            farmer={farmer}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {page === 'grievances' && (
          <Grievances
            t={t}
            lang={lang}
            farmer={farmer}
            complaints={complaints}
            prefillToken={grievancePrefillToken}
            onClearPrefillToken={() => setGrievancePrefillToken(null)}
            onNavigateBack={() => setPage('bookings')}
            onAddComplaint={(newComp) => {
              setComplaints((prev) => [newComp, ...prev]);
              addNotif('sms', lang === 'en' ? `Grievance ${newComp.complaintId} submitted to Mandi Cell.` : `ఫిర్యాదు ${newComp.complaintId} మండి విభాగానికి సమర్పించబడింది.`);
            }}
            onUpdateComplaint={(updated) => {
              setComplaints((prev) => prev.map((c) => (c.complaintId === updated.complaintId ? updated : c)));
            }}
          />
        )}

        {page === 'notifications' && (
          <Notifications
            t={t}
            lang={lang}
            notifications={notifications}
            onRetryNotification={(notifId) => {
              setNotifications((prev) =>
                prev.map((n) => ((n.id === notifId || n.notificationId === notifId) ? { ...n, status: 'DELIVERED', failureReason: null } : n))
              );
            }}
          />
        )}

        {page === 'profile' && (
          <Profile
            t={t}
            lang={lang}
            setLang={setLang}
            farmer={farmer}
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            profileDraft={profileDraft}
            setProfileDraft={setProfileDraft}
            setProfileDraftFromFarmer={() => setProfileDraft(farmer)}
            saveProfile={saveProfile}
            onUpdateMobile={(newNum) => setFarmer((f) => ({ ...f, mobile: newNum }))}
            addNotif={addNotif}
            formatMobile={formatMobile}
          />
        )}
      </main>

      <BookingDetailModal
        t={t}
        lang={lang}
        detailBooking={detailBooking}
        setDetailBookingId={setDetailBookingId}
        queueTick={queueTick}
        peopleAhead={peopleAhead}
        estWaitMin={estWaitMin}
        bookingCropLabel={bookingCropLabel}
        simulateArrival={simulateArrival}
        openReschedule={openReschedule}
        completeProcurement={completeProcurement}
      />

      <RescheduleModal
        t={t}
        lang={lang}
        rescheduleBooking={rescheduleBooking}
        rescheduleDate={rescheduleDate}
        setRescheduleDate={setRescheduleDate}
        rescheduleSlotIdx={rescheduleSlotIdx}
        setRescheduleSlotIdx={setRescheduleSlotIdx}
        spotsLeft={spotsLeft}
        confirmReschedule={confirmReschedule}
        setRescheduleBookingId={setRescheduleBookingId}
      />

      {/* Phase 12 Security, Validation & Automated Testing Console Modal */}
      <SecurityTestModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
      </div>
    </div>
  );
}
