import { useState, useRef } from 'react';
import { sendOtpToPhone, verifyOtpCode } from '../services/authService.js';

export default function MobileUpdateModal({ t, lang, isOpen, onClose, onUpdateMobile, addNotif, formatMobile }) {
  const [step, setStep] = useState(1); // 1: Enter number, 2: OTP
  const [newMobile, setNewMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const otpRefs = useRef([]);

  if (!isOpen) return null;

  const rawDigits = newMobile.replace(/\D/g, '');
  const isValidMobile = rawDigits.length === 10;

  async function handleSendOtp() {
    if (!isValidMobile) return;
    setErrorMsg('');
    setBusy(true);
    try {
      await sendOtpToPhone(rawDigits);
      setStep(2);
      addNotif(
        'sms',
        lang === 'te'
          ? `మీ నమోదిత ఫోన్ +91 ${rawDigits}కు ధృవీకరణ OTP పంపబడింది. దయచేసి SMS ఇన్‌బాక్స్ చూడండి.`
          : `Verification OTP sent to registered mobile +91 ${rawDigits}. Please check your phone SMS inbox.`
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch OTP. Please try again.');
    } finally {
      setBusy(false);
    }
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

  async function handleVerifyAndSave() {
    const enteredOtp = otp.join('').trim();
    if (enteredOtp.length !== 6) return;
    setErrorMsg('');
    setBusy(true);
    try {
      await verifyOtpCode(rawDigits, enteredOtp);
      const formatted = '+91 ' + rawDigits.slice(0, 5) + ' ' + rawDigits.slice(5);
      onUpdateMobile(formatted);
      addNotif(
        'sms',
        lang === 'te'
          ? 'మీ నమోదిత మొబైల్ సంఖ్య నవీకరించబడింది.'
          : lang === 'hi'
          ? 'आपका पंजीकृत मोबाइल नंबर अपडेट हो गया है।'
          : 'Your registered mobile number has been updated.'
      );
      onClose();
      // Reset modal state
      setStep(1);
      setNewMobile('');
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid OTP code. Please check your SMS and try again.');
      setOtp(['', '', '', '', '', '']);
      if (otpRefs.current[0]) otpRefs.current[0].focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              📱 Security Verification
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {t.verifyMobileTitle || 'Update Mobile Number'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="hint ok" style={{ marginBottom: 14 }}>
          🔒 {t.mobileUpdateNotice || '2-step OTP verification required before changing registered mobile number.'}
        </div>

        {errorMsg && (
          <div className="hint error" style={{ marginBottom: 14, color: '#b91c1c', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {step === 1 ? (
          <>
            <div className="field">
              <label>{t.mobileNumber || 'New Mobile Number'} *</label>
              <div className="phone-glass" style={{ border: '1px solid var(--border)' }}>
                <span className="phone-flag" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>🇮🇳 +91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newMobile}
                  onChange={(e) => setNewMobile(formatMobile(e.target.value))}
                  placeholder="98765 43210"
                  style={{ background: 'transparent' }}
                  autoFocus
                />
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
                {t.back || 'Cancel'}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={!isValidMobile || busy}
                onClick={handleSendOtp}
              >
                {busy ? (lang === 'en' ? 'Sending OTP...' : 'OTP పంపుతోంది...') : (t.sendMobileOtp || 'Send OTP') + ' →'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="hint ok" style={{ marginBottom: 12 }}>
              ✓ {t.otpSentTo ? t.otpSentTo('+91 ' + rawDigits) : `OTP sent via SMS to +91 ${rawDigits}. Please check your phone.`}
            </div>
            <label>{t.enterOtp || 'Enter 6-digit OTP'}</label>
            <div className="otp-row" style={{ margin: '8px 0 16px' }}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={v}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                />
              ))}
            </div>

            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={busy}>
                ← {t.back || 'Back'}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={otp.some((d) => !d) || busy}
                onClick={handleVerifyAndSave}
              >
                {busy ? (lang === 'en' ? 'Verifying...' : 'ధృవీకరిస్తోంది...') : `✓ ${t.verifyAndUpdate || 'Verify OTP & Save'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

