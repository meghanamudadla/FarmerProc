import { useState, useEffect } from 'react';

export default function Login({
  t, lang, setLang,
  role, setRole, authMode, setAuthMode, signupStep, setSignupStep,
  signupData, setSD, mobile, setMobile, formatMobile,
  otpSent, setOtpSent, otp, setOtp, otpRefs, handleOtpChange, handleOtpKeyDown, handleOtpPaste,
  login, addNotif, authBusy, authErrorMsg, onSendOtp, onResendOtp, dispatchedOtpInfo,
}) {
  // The login screen is always rendered on a light glass card, regardless of
  // the farmer's saved dashboard theme (dark mode persists across logout).
  // `data-theme="light"` on .login-wrap below only affects descendants that
  // key off an ANCESTOR attribute selector — it can't out-rank the global
  // `:root[data-theme="dark"] input{...}` rules, which target the real root
  // element and were winning the specificity fight, turning every signup
  // input black-on-black. Forcing the attribute onto <html> itself while
  // this page is mounted (and restoring whatever it was on unmount) fixes
  // that at the source instead of patching more CSS specificity.
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    return () => {
      if (prevTheme) root.setAttribute('data-theme', prevTheme);
      else root.removeAttribute('data-theme');
    };
  }, []);

  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    let timer;
    if (otpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, resendTimer]);

  const handleResend = () => {
    if (resendTimer > 0 || authBusy) return;
    setResendTimer(30);
    if (onResendOtp) onResendOtp();
  };

  const rawDigits = mobile.replace(/\D/g, '');
  const isFarmerSignup = authMode === 'signup' && role === 'farmer';
  const step1Valid = signupData.name.trim().length > 1 && signupData.village.trim().length > 1 && signupData.district.trim().length > 1;
  const step2Valid = signupData.landAcres && signupData.aadhaarLast4.length === 4;
  const canSend = rawDigits.length === 10 && (authMode === 'signin' || (isFarmerSignup ? signupStep === 2 && step2Valid : signupData.name.trim().length > 1));


  return (
    <div className="login-wrap" data-theme="light">
      <div className="login-vignette"></div>

      <div className="login-card">
        <div className="login-glow login-glow-a"></div>
        <div className="login-glow login-glow-b"></div>
        <div className="login-glow login-glow-c"></div>

        <div className="login-card-content">
          <div className="login-header">
            <div className="login-eyebrow">🌾 {t.loginEyebrow}</div>
            <h1>
              <span className="brand-accent">Kisan</span>Seva
            </h1>
            <div className="tag">{t.loginTag}</div>
          </div>

          <div className="signin-tabs">
            <button className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>
              🔑 {t.signIn}
            </button>
            <button
              className={authMode === 'signup' ? 'active' : ''}
              onClick={() => {
                setAuthMode('signup');
                setSignupStep(1);
              }}
            >
              ✨ {lang === 'en' ? 'Sign Up / Register' : 'నమోదు చేయండి'}
            </button>
          </div>

          {!otpSent ? (
            <>
              {isFarmerSignup && (
                <div className="signup-steps">
                  <div className={'signup-step-pill' + (signupStep >= 1 ? ' on' : '')}>1 · {lang === 'en' ? 'Personal' : 'వ్యక్తిగత'}</div>
                  <div className="signup-step-line"></div>
                  <div className={'signup-step-pill' + (signupStep >= 2 ? ' on' : '')}>2 · {lang === 'en' ? 'Farm & ID' : 'వ్యవసాయం'}</div>
                </div>
              )}

              {isFarmerSignup && signupStep === 1 && (
                <>
                  <div className="field">
                    <label>{lang === 'en' ? 'Full Name' : 'పూర్తి పేరు'} *</label>
                    <input type="text" value={signupData.name} onChange={(e) => setSD({ name: e.target.value })} placeholder={lang === 'en' ? 'e.g. Ravi Kumar' : 'ఉదా. రవి కుమార్'} />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>{lang === 'en' ? 'Village' : 'గ్రామం'} *</label>
                      <input type="text" value={signupData.village} onChange={(e) => setSD({ village: e.target.value })} placeholder="Kakinada" />
                    </div>
                    <div className="field">
                      <label>{lang === 'en' ? 'District' : 'జిల్లా'} *</label>
                      <input type="text" value={signupData.district} onChange={(e) => setSD({ district: e.target.value })} placeholder="East Godavari" />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!step1Valid} onClick={() => setSignupStep(2)}>
                    {lang === 'en' ? 'Continue' : 'కొనసాగించండి'} →
                  </button>
                </>
              )}

              {isFarmerSignup && signupStep === 2 && (
                <>
                  <div className="field">
                    <label>{t.landArea} *</label>
                    <input type="number" min="0" step="0.1" value={signupData.landAcres} onChange={(e) => setSD({ landAcres: e.target.value })} placeholder="2.0" />
                  </div>
                  <div className="field">
                    <label>
                      {t.primaryCrop} ({lang === 'en' ? 'optional' : 'ఐచ్ఛికం'})
                    </label>
                    <input
                      type="text"
                      value={signupData.primaryCrop}
                      onChange={(e) => setSD({ primaryCrop: e.target.value })}
                      placeholder={lang === 'en' ? 'e.g. Paddy, Cotton — you can add or change this later' : 'ఉదా. వరి, పత్తి — తర్వాత మార్చుకోవచ్చు'}
                    />
                    <div className="hint">
                      {lang === 'en' ? "You'll pick the exact crop and quantity each time you book a slot — this is just for your profile." : 'మీరు స్లాట్ బుక్ చేసేటప్పుడు ఖచ్చితమైన పంటను ఎంచుకుంటారు — ఇది కేవలం మీ ప్రొఫైల్ కోసం మాత్రమే.'}
                    </div>
                  </div>
                  <div className="field">
                    <label>
                      {lang === 'en' ? 'Farmer ID / Kisan Pehchan Patra' : 'ఫార్మర్ ఐడి / కిసాన్ పహచాన్ పత్ర'} ({lang === 'en' ? 'optional' : 'ఐచ్ఛికం'})
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="11"
                      value={signupData.farmerId}
                      onChange={(e) => setSD({ farmerId: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      placeholder="91234567890"
                    />
                    {signupData.farmerId && signupData.farmerId.length < 11 ? (
                      <div className="hint error">
                        {lang === 'en' ? `${11 - signupData.farmerId.length} more digit(s) needed — the AgriStack Farmer ID is 11 digits.` : `ఇంకా ${11 - signupData.farmerId.length} అంకెలు కావాలి — Farmer ID 11 అంకెలు ఉంటుంది.`}
                      </div>
                    ) : (
                      <div className="hint">
                        {lang === 'en'
                          ? "Don't have one yet? Leave blank — we'll verify with Aadhaar instead. In production this auto-fills your land and crop details from the AgriStack Farmer Registry."
                          : 'ఇంకా లేదా? ఖాళీగా వదిలేయండి — ఆధార్‌తో ధృవీకరిస్తాము. ఉత్పత్తిలో ఇది AgriStack నుండి భూమి, పంట వివరాలను ఆటో-ఫిల్ చేస్తుంది.'}
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label>{lang === 'en' ? 'Aadhaar (last 4 digits)' : 'ఆధార్ (చివరి 4 అంకెలు)'} *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="4"
                      value={signupData.aadhaarLast4}
                      onChange={(e) => setSD({ aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="4321"
                    />
                    <div className="hint">{lang === 'en' ? 'Used only to prevent duplicate registrations — simulated for this demo.' : 'డూప్లికేట్ నమోదులను నివారించడానికి మాత్రమే — ఈ డెమో కోసం సిమ్యులేట్ చేయబడింది.'}</div>
                  </div>
                  <div className="field">
                    <div className="field-glass-label">
                      <label>{t.mobileNumber} *</label>
                    </div>
                    <div className="phone-glass">
                      <span className="phone-flag">🇮🇳 +91</span>
                      <input type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(formatMobile(e.target.value))} placeholder="81254 21544" />
                    </div>
                  </div>
                  {authErrorMsg && (
                    <div className="hint error" style={{ marginBottom: 10 }}>
                      ⚠️ {authErrorMsg}
                    </div>
                  )}
                  <div className="btn-row" style={{ marginTop: 0 }}>
                    <button className="btn btn-ghost" onClick={() => setSignupStep(1)}>
                      ← {t.back}
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!canSend || authBusy} onClick={onSendOtp}>
                      {authBusy ? (lang === 'en' ? 'Checking...' : 'తనిఖీ చేస్తోంది...') : (lang === 'en' ? 'Register & Send OTP' : 'నమోదు చేసి OTP పంపండి')}
                    </button>
                  </div>
                </>
              )}

              {!isFarmerSignup && (
                <>
                  <div className="field">
                    <div className="field-glass-label">
                      <label>{t.mobileNumber} *</label>
                    </div>
                    <div className="phone-glass">
                      <span className="phone-flag">🇮🇳 +91</span>
                      <input type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(formatMobile(e.target.value))} placeholder="81254 21544" />
                    </div>
                  </div>
                  {authErrorMsg && (
                    <div className="hint error" style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#b91c1c',
                      fontSize: '13px',
                      lineHeight: '1.45',
                      textAlign: 'left'
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ {lang === 'en' ? 'Database Notice' : 'డేటాబేస్ నోటీసు'}</div>
                      <div>{authErrorMsg}</div>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          marginTop: 8,
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: '#2fbf71',
                          color: '#04140a',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => {
                          setAuthMode('signup');
                          setSignupStep(1);
                        }}
                      >
                        ✍️ {lang === 'en' ? 'Register as New Farmer Now' : 'ఇప్పుడే కొత్త రైతుగా నమోదు చేసుకోండి'} →
                      </button>
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSend || authBusy} onClick={onSendOtp}>
                    {authBusy ? (lang === 'en' ? 'Checking Database & Sending OTP...' : 'డేటాబేస్ తనిఖీ చేసి OTP పంపుతోంది...') : (lang === 'en' ? 'Check Database & Send OTP' : 'డేటాబేస్ తనిఖీ చేసి OTP పంపండి')}
                  </button>
                </>
              )}

              {role === 'farmer' && (
                <div className="login-secondary">
                  {authMode === 'signin' ? (
                    <>
                      {lang === 'en' ? 'New farmer?' : 'కొత్త రైతా?'}{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setAuthMode('signup');
                          setSignupStep(1);
                        }}
                      >
                        {lang === 'en' ? 'Create an account' : 'ఖాతా సృష్టించండి'}
                      </a>
                    </>
                  ) : (
                    <>
                      {lang === 'en' ? 'Already registered?' : 'ఇప్పటికే నమోదు అయ్యారా?'}{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setAuthMode('signin');
                        }}
                      >
                        {t.signIn}
                      </a>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Official SMS Dispatch Alert */}
              <div
                style={{
                  marginBottom: 14,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  color: '#065f46',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', marginBottom: 4 }}>
                  <span>📲</span>
                  <span>
                    {lang === 'en'
                      ? `OTP Sent to Registered Mobile: +91 ${mobile}`
                      : `నమోదిత మొబైల్‌కు OTP పంపబడింది: +91 ${mobile}`}
                  </span>
                </div>
                <div>
                  {dispatchedOtpInfo?.smsDelivered ? (
                    <span style={{ color: '#047857', fontWeight: 600 }}>
                      ✓ {lang === 'en' ? `Real SMS delivered via ${dispatchedOtpInfo.provider}. Check your phone.` : `SMS ద్వారా OTP పంపబడింది. మీ ఫోన్ చూడండి.`}
                    </span>
                  ) : (
                    <span>
                      {lang === 'en'
                        ? '6-digit verification code has been dispatched to this registered number.'
                        : 'ఈ నమోదిత నంబర్‌కు 6 అంకెల ధృవీకరణ కోడ్ పంపబడింది.'}
                    </span>
                  )}
                </div>

                {dispatchedOtpInfo?.otp && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '6px 10px',
                      background: 'rgba(5, 150, 105, 0.12)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#065f46' }}>
                        {lang === 'en' ? 'Dispatched Code:' : 'పంపబడిన కోడ్:'}
                      </span>{' '}
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'monospace',
                          fontSize: '16px',
                          fontWeight: 800,
                          letterSpacing: '3px',
                          background: '#047857',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {dispatchedOtpInfo.otp}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: '#047857',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const digits = String(dispatchedOtpInfo.otp).slice(0, 6).split('');
                        setOtp(digits);
                      }}
                    >
                      ⚡ {lang === 'en' ? 'Auto-Fill OTP' : 'OTP నింపండి'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>{t.enterOtp}</label>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {lang === 'en' ? '6-digit code' : '6 అంకెల కోడ్'}
                </span>
              </div>

              <div className="otp-row">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={v}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              {authErrorMsg && (
                <div className="hint error" style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#b91c1c',
                  fontSize: '13px'
                }}>
                  ⚠️ {authErrorMsg}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                disabled={otp.some((d) => !d) || authBusy}
                onClick={login}
              >
                {authBusy ? (lang === 'en' ? 'Verifying with Database...' : 'డేటాబేస్‌తో ధృవీకరిస్తోంది...') : (lang === 'en' ? 'Verify OTP & Open Dashboard →' : 'OTP ధృవీకరించి డ్యాష్‌బోర్డ్ తెరవండి →')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: '13px' }}>
                <a
                  href="#"
                  style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setOtpSent(false);
                    setOtp(['', '', '', '', '', '']);
                  }}
                >
                  ← {lang === 'en' ? 'Change Number' : 'నంబర్ మార్చండి'}
                </a>

                {resendTimer > 0 ? (
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {lang === 'en' ? `Resend in ${resendTimer}s` : `${resendTimer}సె లో మళ్ళీ పంపండి`}
                  </span>
                ) : (
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#059669',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                    onClick={handleResend}
                    disabled={authBusy}
                  >
                    🔄 {lang === 'en' ? 'Resend OTP' : 'మళ్ళీ OTP పంపండి'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="lang-toggle-glass" style={{ margin: '14px 0 0 0' }}>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              🇬🇧 English
            </button>
            <button className={lang === 'te' ? 'active' : ''} onClick={() => setLang('te')}>
              🇮🇳 తెలుగు
            </button>
            <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
              🇮🇳 हिन्दी
            </button>
          </div>
          <div className="login-footer">
            <span className="dot"></span>
            {lang === 'en' ? 'Digital Agriculture Infrastructure System' : 'డిజిటల్ వ్యవసాయ మౌలిక సదుపాయ వ్యవస్థ'}
          </div>
        </div>
      </div>
    </div>
  );
}
