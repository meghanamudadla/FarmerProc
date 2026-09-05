import { useState, useEffect, useRef, useMemo } from 'react';
import { STR, NOTIF_TEMPLATES } from './i18n/strings.js';
import {
  CROPS, CENTRES, SLOT_TIMES, SLOT_CAPACITY,
  cropById, centreById, seedSlotBooked, paymentMethodFor, PAY_SEQUENCE, nextPayStage, DEFAULT_RATE,
} from './data/domain.js';

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

const RECENT_NUMBER = '8125421544';

function formatMobile(v) {
  const digits = v.replace(/\D/g, '').slice(0, 10);
  return digits.length > 5 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;
}

export default function App() {
  const [lang, setLang] = useState('en');
  const t = STR[lang];
  const nt = NOTIF_TEMPLATES[lang];

  const [authed, setAuthed] = useState(false);
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

  const [page, setPage] = useState('dashboard');

  const [farmer, setFarmer] = useState({
    name: 'Ravi Kumar', mobile: '+91 8125421544', location: 'Kakinada, East Godavari, Andhra Pradesh',
    landAcres: '', primaryCrop: '', aadhaarLast4: '', farmerId: '',
  });
  const [profileDraft, setProfileDraft] = useState(farmer);
  const [editingProfile, setEditingProfile] = useState(false);

  const [bookings, setBookings] = useState([
    { id: 'b1', token: 'PDC-F51B1E', cropId: 'cotton', cropCustom: false, cropLabel: null, qty: 70, centreId: 'c2', date: '2026-09-03', slotIdx: 1, status: 'completed', price: 462400, paymentStatus: 'credited', paymentMethod: paymentMethodFor('PDC-F51B1E'), checkedIn: true, arrivalTime: '09:14 AM' },
    { id: 'b2', token: 'PDC-284391', cropId: 'paddy', cropCustom: false, cropLabel: null, qty: 60, centreId: 'c1', date: '2026-09-03', slotIdx: 0, status: 'cancelled', price: 0, paymentStatus: 'none', paymentMethod: paymentMethodFor('PDC-284391'), checkedIn: false, arrivalTime: null },
  ]);
  const [slotFill, setSlotFill] = useState({}); // key -> extra bookings made in this session

  const [notifications, setNotifications] = useState([
    { id: 'n0', channel: 'push', text: lang === 'en' ? 'Welcome to FasalFlow. Complete your profile to book your first slot.' : 'FasalFlowకి స్వాగతం. మీ మొదటి స్లాట్ బుక్ చేయడానికి ప్రొఫైల్ పూర్తి చేయండి.', time: '2 days ago' },
  ]);

  const [activeBookingId, setActiveBookingId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changingNumber, setChangingNumber] = useState(false);
  const [newMobileDraft, setNewMobileDraft] = useState('');
  const [detailBookingId, setDetailBookingId] = useState(null);
  const [queueTick, setQueueTick] = useState(0);
  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlotIdx, setRescheduleSlotIdx] = useState(null);

  // booking form state
  const [form, setForm] = useState({ cropText: CROPS[0].en, qty: '', centreId: 'c1', date: '2026-09-10', slotIdx: null });
  function findCrop(text) {
    const t2 = (text || '').trim().toLowerCase();
    if (!t2) return null;
    return CROPS.find((c) => c.en.toLowerCase() === t2 || c.te === text.trim()) || null;
  }
  const [bookStep, setBookStep] = useState(1);
  const [bank, setBank] = useState({ holder: '', bankName: '', acc: '', confirmAcc: '', ifsc: '' });

  function addNotif(channel, text) {
    setNotifications((prev) => [{ id: 'n' + Date.now() + Math.random(), channel, text, time: lang === 'en' ? 'just now' : 'ఇప్పుడే' }, ...prev]);
  }

  function bookingCropLabel(b) {
    return b.cropCustom ? b.cropLabel : cropById(b.cropId)[lang];
  }
  const matchedCrop = findCrop(form.cropText);
  const eligibleQty = useMemo(() => {
    const acres = parseFloat(farmer.landAcres);
    if (!acres || !matchedCrop) return null;
    return Math.round(acres * matchedCrop.yieldPerAcre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer.landAcres, form.cropText]);

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
        name: signupData.name.trim(),
        mobile: '+91 ' + mobile,
        location: [signupData.village, signupData.district].filter(Boolean).join(', '),
        landAcres: signupData.landAcres,
        primaryCrop: signupData.primaryCrop,
        aadhaarLast4: signupData.aadhaarLast4,
        farmerId: signupData.farmerId,
      }));
    }
    setAuthed(true);
    const first = (authMode === 'signup' && signupData.name.trim() ? signupData.name.trim() : farmer.name).split(' ')[0];
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

  function confirmBooking() {
    const centre = centreById(form.centreId);
    const token = 'PDC-' + Math.random().toString(16).slice(2, 8).toUpperCase();
    const typedCropLabel = form.cropText.trim();
    const cropLabel = matchedCrop ? matchedCrop[lang] : typedCropLabel;
    const price = matchedCrop ? Math.round(qtyNum * matchedCrop.msp) : Math.round(qtyNum * DEFAULT_RATE);
    const b = {
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
      addNotif('push', nt.payInit(price.toLocaleString('en-IN'), paymentMethodFor(token)));
    } else {
      addNotif(
        'push',
        lang === 'en'
          ? `${cropLabel} isn't on our standard MSP list — the centre officer will confirm today's rate and eligible quantity when you arrive.`
          : `${cropLabel} మా ప్రామాణిక MSP జాబితాలో లేదు — మీరు చేరుకున్నప్పుడు కేంద్ర అధికారి ధరను నిర్ధారిస్తారు.`
      );
    }
    setBookStep(1);
    setForm({ cropText: CROPS[0].en, qty: '', centreId: 'c1', date: '2026-09-10', slotIdx: null });
    setBank({ holder: '', bankName: '', acc: '', confirmAcc: '', ifsc: '' });
    setPage('bookings');
  }

  const activeBooking = bookings.find((b) => b.id === activeBookingId) || bookings.find((b) => b.status === 'booked');
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
        RECENT_NUMBER={RECENT_NUMBER}
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

  /* ---------------- MAIN APP ---------------- */
  return (
    <div className="app-shell">
      <Sidebar t={t} lang={lang} setLang={setLang} page={page} setPage={setPage} setBookStep={setBookStep} logout={logout} />

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
            spotsLeft={spotsLeft}
            bank={bank}
            setBank={setBank}
            confirmBooking={confirmBooking}
          />
        )}

        {page === 'bookings' && (
          <Bookings t={t} lang={lang} bookings={bookings} setDetailBookingId={setDetailBookingId} bookingCropLabel={bookingCropLabel} setPage={setPage} />
        )}

        {page === 'queue' && (
          <Queue
            t={t}
            lang={lang}
            activeBooking={activeBooking}
            peopleAhead={peopleAhead}
            estWaitMin={estWaitMin}
            queueTick={queueTick}
            bookingCropLabel={bookingCropLabel}
            openReschedule={openReschedule}
            cancelActiveBooking={cancelActiveBooking}
          />
        )}

        {page === 'payments' && <Payments t={t} activeBooking={activeBooking} bookings={bookings} totalValue={totalValue} />}

        {page === 'notifications' && <Notifications t={t} notifications={notifications} />}

        {page === 'profile' && (
          <Profile
            t={t}
            lang={lang}
            farmer={farmer}
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            profileDraft={profileDraft}
            setProfileDraft={setProfileDraft}
            setProfileDraftFromFarmer={() => setProfileDraft(farmer)}
            saveProfile={saveProfile}
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
    </div>
  );
}
