import { useState, useRef } from 'react';

export default function MobileUpdateModal({ t, lang, isOpen, onClose, onUpdateMobile, addNotif, formatMobile }) {
  const [step, setStep] = useState(1); // 1: Enter number, 2: OTP
  const [newMobile, setNewMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  if (!isOpen) return null;

  const rawDigits = newMobile.replace(/\D/g, '');
  const isValidMobile = rawDigits.length === 10;

  function handleSendOtp() {
    if (!isValidMobile) return;
    setStep(2);
    addNotif('sms', lang === 'te' ? `నవీకరణ కోసం మీ OTP 7192.` : lang === 'hi' ? `अपडेट के लिए आपका ओटीपी 7192 है।` : `Your mobile update OTP is 7192. Do not share it.`);
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

  function handleVerifyAndSave() {
    if (otp.some((d) => !d)) return;
    const formatted = '+91 ' + rawDigits.slice(0, 5) + ' ' + rawDigits.slice(5);
    onUpdateMobile(formatted);
    addNotif('sms', lang === 'te' ? `మీ నమోదిత మొబైల్ సంఖ్య నవీకరించబడింది.` : lang === 'hi' ? `आपका पंजीकृत मोबाइल नंबर अपडेट हो गया है।` : `Your registered mobile number has been updated.`);
    onClose();
    // Reset modal state
    setStep(1);
    setNewMobile('');
    setOtp(['', '', '', '', '', '']);
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
              <button className="btn btn-ghost" onClick={onClose}>
                {t.back || 'Cancel'}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={!isValidMobile}
                onClick={handleSendOtp}
              >
                {t.sendMobileOtp || 'Send OTP'} →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="hint ok" style={{ marginBottom: 12 }}>
              ✓ {t.otpSentTo ? t.otpSentTo('+91 ' + rawDigits) : `OTP sent to +91 ${rawDigits}`}
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
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                ← {t.back || 'Back'}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={otp.some((d) => !d)}
                onClick={handleVerifyAndSave}
              >
                ✓ {t.verifyAndUpdate || 'Verify OTP & Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
