import { useEffect } from 'react';

export default function Login({
  t, lang, setLang,
  role, setRole, authMode, setAuthMode, signupStep, setSignupStep,
  signupData, setSD, mobile, setMobile, formatMobile,
  otpSent, setOtpSent, otp, setOtp, otpRefs, handleOtpChange, handleOtpKeyDown, handleOtpPaste,
  login, addNotif, authBusy, authErrorMsg, onSendOtp,
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
                    <div className="hint error" style={{ marginBottom: 10 }}>
                      ⚠️ {authErrorMsg}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSend || authBusy} onClick={onSendOtp}>
                    {authBusy ? (lang === 'en' ? 'Checking...' : 'తనిఖీ చేస్తోంది...') : t.sendOtp}
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
              <div className="hint ok" style={{ marginBottom: 10 }}>
                ✓ {t.otpSentTo('+91 ' + mobile)}
              </div>
              <label>{t.enterOtp}</label>
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
                <div className="hint error" style={{ marginTop: 10 }}>
                  ⚠️ {authErrorMsg}
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                disabled={otp.some((d) => !d) || authBusy}
                onClick={login}
              >
                {authBusy ? (lang === 'en' ? 'Verifying...' : 'ధృవీకరిస్తోంది...') : t.verify}
              </button>
              <div className="login-secondary">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOtpSent(false);
                    setOtp(['', '', '', '', '', '']);
                  }}
                >
                  ← {lang === 'en' ? 'Change number' : 'నంబర్ మార్చండి'}
                </a>
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
