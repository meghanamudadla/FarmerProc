import { useState, useEffect, useRef, useMemo } from 'react';
import { STR, NOTIF_TEMPLATES } from './i18n/strings.js';
import {
  CROPS, SLOT_TIMES, SLOT_CAPACITY, INITIAL_FARMER_CROPS,
  cropById, centreById, seedSlotBooked, paymentMethodFor, PAY_SEQUENCE, nextPayStage, DEFAULT_RATE,
} from './data/domain.js';
import { queueService } from './services/queueService.js';
import { notificationEngine } from './services/notificationEngine.js';
import { CropRepository } from './services/cropRepository.js';

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
import MandiStaffPage from './pages/MandiStaffPage.jsx';
import { complaintService } from './services/complaintService.js';
import { offlineSyncService } from './services/offlineSyncService.js';
import SecurityTestModal from './components/SecurityTestModal.jsx';

const RECENT_NUMBER = '8125421544';

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

  const [authed, setAuthed] = useState(() => {
    try {
      const stored = localStorage.getItem('kisanseva_authed');
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kisanseva_authed', JSON.stringify(authed));
    } catch (e) {
      console.warn('Could not persist authed', e);
    }
  }, [authed]);

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
      localStorage.setItem('kisanseva_authed', JSON.stringify(false));
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
  const [crops, setCrops] = useState(() => CropRepository.getCropsForFarmer('FRM-10245'));

  useEffect(() => {
    if (farmer?.farmerId) {
      setCrops(CropRepository.getCropsForFarmer(farmer.farmerId));
    }
  }, [farmer?.farmerId]);

  const [profileDraft, setProfileDraft] = useState(farmer);
  const [editingProfile, setEditingProfile] = useState(false);

  const BOOKINGS_STORAGE_KEY = 'kisanseva_farmer_bookings';

  // Process walkthrough samples demonstrating the 4 government procurement stages:
  // Stage 1: BOOKED (Original PDC-62F388)
  // Stage 2: WAITING (Gate Checked-In & Waiting Yard Queue)
  // Stage 3: PROCESSING (Called to Counter & Weighbridge Scales)
  // Stage 4: COMPLETED (Weighing Finalized, Digital Receipt & DBT Credited)
  const PROCESS_WALKTHROUGH_SAMPLES = [
    {
      id: 'b_sample_waiting',
      token: 'PDC-71B420',
      farmerId: 'FRM-10245',
      cropRecordId: 'CROP-102',
      cropId: 'cotton',
      cropCustom: false,
      cropLabel: 'Cotton',
      qty: 28,
      centreId: 'c2',
      date: '2026-09-09',
      slotIdx: 1,
      status: 'waiting',
      price: 199360,
      paymentStatus: 'initiated',
      paymentMethod: 'Direct DBT Payout (Aadhaar Seeded)',
      checkedIn: true,
      arrivalTime: '09:18 AM',
      isDemoProcessSample: true,
      createdTimestamp: '2026-09-09T03:48:00.000Z',
    },
    {
      id: 'b_sample_processing',
      token: 'PDC-84C109',
      farmerId: 'FRM-10245',
      cropRecordId: 'CROP-101',
      cropId: 'paddy',
      cropCustom: false,
      cropLabel: 'Paddy (Grade A)',
      qty: 50,
      centreId: 'c1',
      date: '2026-09-09',
      slotIdx: 0,
      status: 'processing',
      price: 115000,
      paymentStatus: 'processing',
      paymentMethod: 'Direct DBT Payout (Aadhaar Seeded)',
      checkedIn: true,
      arrivalTime: '08:22 AM',
      counterNumber: 1,
      isDemoProcessSample: true,
      createdTimestamp: '2026-09-09T02:52:00.000Z',
    },
    {
      id: 'b_sample_completed',
      token: 'PDC-95E312',
      farmerId: 'FRM-10245',
      cropRecordId: 'CROP-102',
      cropId: 'cotton',
      cropCustom: false,
      cropLabel: 'Cotton',
      qty: 30,
      centreId: 'c2',
      date: '2026-09-03',
      slotIdx: 2,
      status: 'completed',
      price: 213600,
      paymentStatus: 'credited',
      paymentMethod: 'Direct DBT Payout (Aadhaar Seeded)',
      checkedIn: true,
      arrivalTime: '10:55 AM',
      counterNumber: 2,
      isDemoProcessSample: true,
      createdTimestamp: '2026-09-03T05:25:00.000Z',
    },
  ];

  const ORIGINAL_FARMER_BOOKING = {
    id: 'b_active_62f388',
    token: 'PDC-62F388',
    farmerId: 'FRM-10245',
    cropRecordId: 'CROP-101',
    cropId: 'paddy',
    cropCustom: false,
    cropLabel: 'Paddy (Grade A)',
    qty: 100,
    centreId: 'c1',
    date: '2026-09-10',
    slotIdx: 0,
    status: 'booked',
    price: 230000,
    paymentStatus: 'initiated',
    paymentMethod: 'Direct DBT Payout (Aadhaar Seeded)',
    checkedIn: false,
    arrivalTime: null,
    isOriginalUserBooking: true,
    createdTimestamp: new Date().toISOString(),
  };

  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Purge random mock tokens from previous sessions
          const clean = parsed.filter(
            (b) =>
              b &&
              !b.id?.startsWith('bq_') &&
              b.id !== 'b_farmer' &&
              b.id !== 'b_hist1' &&
              b.token !== 'PDC-A102' &&
              b.token !== 'PDC-A098' &&
              b.token !== 'PDC-A099' &&
              b.token !== 'PDC-A100' &&
              b.token !== 'PDC-A101' &&
              b.token !== 'PDC-F51B1E'
          );

          // Ensure original booking is preserved
          const hasOriginal = clean.some((b) => b.token === 'PDC-62F388');
          const list = hasOriginal ? clean : [ORIGINAL_FARMER_BOOKING, ...clean];

          // Ensure process samples are included for the user to understand the flow
          const sampleTokens = new Set(PROCESS_WALKTHROUGH_SAMPLES.map((s) => s.token));
          const missingSamples = PROCESS_WALKTHROUGH_SAMPLES.filter((s) => !list.some((b) => b.token === s.token));
          return [...list, ...missingSamples];
        }
      }
    } catch (e) {
      console.warn('Could not parse stored bookings', e);
    }

    // Default: Original booking + Process flow samples
    return [ORIGINAL_FARMER_BOOKING, ...PROCESS_WALKTHROUGH_SAMPLES];
  });

  // Automatically persist farmer's bookings to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      console.warn('Failed to save bookings to localStorage', e);
    }
  }, [bookings]);

  function handleRemoveSampleData() {
    setBookings((prev) => prev.filter((b) => !b.isDemoProcessSample));
    addNotif('sms', lang === 'en' ? 'Process demo samples removed. Only your original crop bookings remain.' : 'నమూనా డేటా తీసివేయబడింది. అసలు బుకింగ్‌లు మాత్రమే ఉన్నాయి.');
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

  function login() {
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
    setAuthed(true);
    try {
      localStorage.setItem('kisanseva_authed', JSON.stringify(true));
    } catch (e) {}
    const first = (authMode === 'signup' && signupData.name.trim() ? signupData.name.trim() : farmer.fullName).split(' ')[0];
    addNotif('sms', lang === 'en' ? `Welcome${authMode === 'signup' ? '' : ' back'}, ${first}.` : `${authMode === 'signup' ? '' : 'మళ్ళీ '}స్వాగతం, ${first}.`);
    if (authMode === 'signup') {
      addNotif('push', lang === 'en' ? 'Registration complete. Your eligible quantity has been calculated from your land details.' : 'నమోదు పూర్తయింది. మీ భూమి వివరాల ఆధారంగా అర్హత పరిమాణం లెక్కించబడింది.');
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
    setAuthed(false);
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setMobile('');
    setAuthMode('signin');
    setSignupStep(1);
    setPage('dashboard');
  }

  const qtyNum = parseFloat(form.qty);
  const overLimit = eligibleQty != null && qtyNum > eligibleQty;
  const profileComplete = !!farmer.landAcres;

  function confirmBooking(processedBooking) {
    const centre = centreById(form.centreId);
    const token = processedBooking?.token || ('PDC-' + Math.random().toString(16).slice(2, 8).toUpperCase());
    const typedCropLabel = form.cropText.trim();
    const cropLabel = matchedCrop ? matchedCrop[lang] : typedCropLabel;
    const price = processedBooking?.price || (matchedCrop ? Math.round(qtyNum * matchedCrop.msp) : Math.round(qtyNum * DEFAULT_RATE));

    const b = processedBooking || {
      id: 'b' + Date.now(), token, cropId: matchedCrop ? matchedCrop.id : null, cropCustom: !matchedCrop, cropLabel: matchedCrop ? null : typedCropLabel, qty: qtyNum,
      centreId: form.centreId, date: form.date, slotIdx: form.slotIdx, status: 'booked', price,
      paymentStatus: matchedCrop ? 'initiated' : 'pending_verification', paymentMethod: paymentMethodFor(token), checkedIn: false, arrivalTime: null,
    };

    setBookings((prev) => [b, ...prev]);
    setSlotFill((prev) => ({ ...prev, [slotKey(form.centreId, form.date, form.slotIdx)]: (prev[slotKey(form.centreId, form.date, form.slotIdx)] || 0) + 1 }));
    setActiveBookingId(b.id);
    addNotif('sms', nt.booked(token, form.date, SLOT_TIMES[form.slotIdx], centre[lang]));
    addNotif('ivr', nt.ivrNote);
    if (matchedCrop) {
      addNotif('push', nt.payInit(price.toLocaleString('en-IN'), b.paymentMethod || paymentMethodFor(token)));
    }
    setBookStep(1);
    setForm({ cropText: CROPS[0].en, qty: '', centreId: 'c1', date: '2026-09-10', slotIdx: null });
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

  function saveProfile() {
    setFarmer(profileDraft);
    setEditingProfile(false);
    addNotif('push', lang === 'en' ? 'Profile updated. Your eligible quantity has been recalculated.' : 'ప్రొఫైల్ నవీకరించబడింది. మీ అర్హత పరిమాణం మళ్ళీ లెక్కించబడింది.');
  }

  const totalValue = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? b.price : 0), 0);
  const paidValue = bookings.reduce((s, b) => s + (b.paymentStatus === 'credited' ? b.price : 0), 0);
  const pendingValue = totalValue - paidValue;

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
      />
    );
  }

  function handleSetLang(newLang) {
    setLang(newLang);
    setFarmer((f) => ({ ...f, preferredLanguage: newLang }));
  }

  function handleTriggerOfflineSync() {
    offlineSyncService.syncPendingQueue((item) => {
      if (item.type === 'BOOKING_REQUEST') {
        const result = BookingEngine.validateAndProcessBooking({
          farmer,
          crops,
          matchedCrop: findCrop(item.payload.form.cropText),
          requestedQty: item.payload.form.qty,
          centre: centreById(item.payload.form.centreId),
          date: item.payload.form.date,
          slotIdx: item.payload.form.slotIdx,
          slotTimes: SLOT_TIMES,
          bankDetails: item.payload.bank,
          existingBookings: bookings,
        });

        if (result.success) {
          confirmBooking(result.booking);
          addNotif('sms', lang === 'en' ? `Re-sync complete: Token ${result.booking.token} confirmed!` : `సింక్ పూర్తయింది: టోకెన్ ${result.booking.token} నిర్ధారించబడింది!`);
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
            onNavigateToMandiStaff={() => setPage('mandiStaff')}
            onCheckInSuccess={(bId, arrivalTime) => {
              setBookings((bs) => bs.map((b) => (b.id === bId ? { ...b, checkedIn: true, arrivalTime: arrivalTime || '09:30 AM', status: 'checked_in' } : b)));
              addNotif('sms', lang === 'en' ? 'Gate check-in verified. Queue entry created.' : 'గేట్ చెక్-ఇన్ ధృవీకరించబడింది. క్యూ నమోదు సృష్టించబడింది.');
            }}
          />
        )}

        {page === 'mandiStaff' && (
          <MandiStaffPage
            t={t}
            lang={lang}
            farmer={farmer}
            bookings={bookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onResetQueueData={handleResetQueueData}
            onOpenReceipt={handleOpenReceipt}
            onBackToQueue={() => setPage('queue')}
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
