import { useEffect, useState } from "react";

export default function Login({
  t,
  lang,
  setLang,
  role,
  setRole,
  authMode,
  setAuthMode,
  signupStep,
  setSignupStep,
  signupData,
  setSD,
  mobile,
  setMobile,
  formatMobile,
  otpSent,
  setOtpSent,
  otp,
  setOtp,
  otpRefs,
  handleOtpChange,
  handleOtpKeyDown,
  handleOtpPaste,
  login,
  addNotif,
}) {
 const [localPassword, setLocalPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

  // Keep login page in light theme.
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute("data-theme");

    root.setAttribute("data-theme", "light");

    return () => {
      if (prevTheme) {
        root.setAttribute("data-theme", prevTheme);
      } else {
        root.removeAttribute("data-theme");
      }
    };
  }, []);

  const rawDigits = mobile.replace(/\D/g, "");

  const isFarmerSignup =
    authMode === "signup" && role === "farmer";

  const step1Valid =
    signupData.name.trim().length > 1 &&
    signupData.village.trim().length > 1 &&
    signupData.district.trim().length > 1;

  const step2Valid =
    signupData.landAcres &&
    signupData.aadhaarLast4.length === 4 &&
    password.length >= 6 &&
    password === confirmPassword;

  const canSend =
    rawDigits.length === 10 &&
    (
      authMode === "signin"
        ? password.length >= 6
        : isFarmerSignup
          ? signupStep === 2 && step2Valid
          : signupData.name.trim().length > 1
    );

  function sendOtp() {
    setOtpSent(true);

    addNotif(
      "sms",
      lang === "en"
        ? "Your OTP is 4821. Do not share it with anyone."
        : "మీ OTP 4821. దీనిని ఎవరితోనూ పంచుకోవద్దు."
    );
  }

  function handleLogin() {
  if (typeof login === "function") {
    login({
      phone: rawDigits,
      password,
      mode: authMode,
      signupData,
    });
  }
}

  return (
    <div className="login-wrap" data-theme="light">
      <div className="login-vignette"></div>

      <div className="login-card">
        <div className="login-glow login-glow-a"></div>
        <div className="login-glow login-glow-b"></div>
        <div className="login-glow login-glow-c"></div>

        <div className="login-card-content">

          {/* HEADER */}
          <div className="login-header">
            <div className="login-eyebrow">
              🌾 {t.loginEyebrow}
            </div>

            <h1>
              <span className="brand-accent">Kisan</span>Seva
            </h1>

            <div className="tag">
              {t.loginTag}
            </div>
          </div>


          {/* SIGN IN / SIGN UP TABS */}
          <div className="signin-tabs">

            <button
              className={
                authMode === "signin"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setAuthMode("signin");
                setSignupStep(1);
                setOtpSent(false);
                setPassword("");
                setConfirmPassword("");
              }}
            >
              🔑 {t.signIn}
            </button>

            <button
              className={
                authMode === "signup"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setAuthMode("signup");
                setSignupStep(1);
                setOtpSent(false);
                setPassword("");
                setConfirmPassword("");
              }}
            >
              ✨{" "}
              {lang === "en"
                ? "Sign Up / Register"
                : "నమోదు చేయండి"}
            </button>

          </div>


          {/* BEFORE OTP */}
          {!otpSent ? (
            <>

              {/* SIGNUP STEPS */}
              {isFarmerSignup && (
                <div className="signup-steps">

                  <div
                    className={
                      "signup-step-pill" +
                      (signupStep >= 1
                        ? " on"
                        : "")
                    }
                  >
                    1 ·{" "}
                    {lang === "en"
                      ? "Personal"
                      : "వ్యక్తిగత"}
                  </div>

                  <div className="signup-step-line"></div>

                  <div
                    className={
                      "signup-step-pill" +
                      (signupStep >= 2
                        ? " on"
                        : "")
                    }
                  >
                    2 ·{" "}
                    {lang === "en"
                      ? "Farm & ID"
                      : "వ్యవసాయం"}
                  </div>

                </div>
              )}


              {/* SIGNUP STEP 1 */}
              {isFarmerSignup &&
                signupStep === 1 && (
                  <>

                    <div className="field">
                      <label>
                        {lang === "en"
                          ? "Full Name"
                          : "పూర్తి పేరు"}{" "}
                        *
                      </label>

                      <input
                        type="text"
                        value={signupData.name}
                        onChange={(e) =>
                          setSD({
                            name: e.target.value,
                          })
                        }
                        placeholder={
                          lang === "en"
                            ? "e.g. Ravi Kumar"
                            : "ఉదా. రవి కుమార్"
                        }
                      />
                    </div>


                    <div className="field-row">

                      <div className="field">
                        <label>
                          {lang === "en"
                            ? "Village"
                            : "గ్రామం"}{" "}
                          *
                        </label>

                        <input
                          type="text"
                          value={signupData.village}
                          onChange={(e) =>
                            setSD({
                              village:
                                e.target.value,
                            })
                          }
                          placeholder="Kakinada"
                        />
                      </div>


                      <div className="field">
                        <label>
                          {lang === "en"
                            ? "District"
                            : "జిల్లా"}{" "}
                          *
                        </label>

                        <input
                          type="text"
                          value={signupData.district}
                          onChange={(e) =>
                            setSD({
                              district:
                                e.target.value,
                            })
                          }
                          placeholder="East Godavari"
                        />
                      </div>

                    </div>


                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        justifyContent:
                          "center",
                      }}
                      disabled={!step1Valid}
                      onClick={() =>
                        setSignupStep(2)
                      }
                    >
                      {lang === "en"
                        ? "Continue"
                        : "కొనసాగించండి"}{" "}
                      →
                    </button>

                  </>
                )}


              {/* SIGNUP STEP 2 */}
              {isFarmerSignup &&
                signupStep === 2 && (
                  <>

                    <div className="field">
                      <label>
                        {t.landArea} *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={
                          signupData.landAcres
                        }
                        onChange={(e) =>
                          setSD({
                            landAcres:
                              e.target.value,
                          })
                        }
                        placeholder="2.0"
                      />
                    </div>


                    <div className="field">
                      <label>
                        {t.primaryCrop}{" "}
                        (
                        {lang === "en"
                          ? "optional"
                          : "ఐచ్ఛికం"}
                        )
                      </label>

                      <input
                        type="text"
                        value={
                          signupData.primaryCrop
                        }
                        onChange={(e) =>
                          setSD({
                            primaryCrop:
                              e.target.value,
                          })
                        }
                        placeholder={
                          lang === "en"
                            ? "e.g. Paddy, Cotton"
                            : "ఉదా. వరి, పత్తి"
                        }
                      />

                      <div className="hint">
                        {lang === "en"
                          ? "You'll pick the exact crop and quantity each time you book a slot."
                          : "మీరు స్లాట్ బుక్ చేసేటప్పుడు ఖచ్చితమైన పంటను ఎంచుకుంటారు."}
                      </div>
                    </div>


                    <div className="field">
                      <label>
                        {lang === "en"
                          ? "Farmer ID / Kisan Pehchan Patra"
                          : "ఫార్మర్ ఐడి / కిసాన్ పహచాన్ పత్ర"}{" "}
                        (
                        {lang === "en"
                          ? "optional"
                          : "ఐచ్ఛికం"}
                        )
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="11"
                        value={
                          signupData.farmerId
                        }
                        onChange={(e) =>
                          setSD({
                            farmerId:
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 11),
                          })
                        }
                        placeholder="91234567890"
                      />

                      <div className="hint">
                        {lang === "en"
                          ? "Leave blank if you do not have one yet."
                          : "ఇంకా లేకపోతే ఖాళీగా వదిలేయండి."}
                      </div>
                    </div>


                    <div className="field">
                      <label>
                        {lang === "en"
                          ? "Aadhaar (last 4 digits)"
                          : "ఆధార్ (చివరి 4 అంకెలు)"}{" "}
                        *
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="4"
                        value={
                          signupData.aadhaarLast4
                        }
                        onChange={(e) =>
                          setSD({
                            aadhaarLast4:
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                          })
                        }
                        placeholder="4321"
                      />
                    </div>


                    {/* MOBILE */}
                    <div className="field">

                      <div className="field-glass-label">
                        <label>
                          {t.mobileNumber} *
                        </label>
                      </div>

                      <div className="phone-glass">

                        <span className="phone-flag">
                          🇮🇳 +91
                        </span>

                        <input
                          type="tel"
                          inputMode="numeric"
                          value={mobile}
                          onChange={(e) =>
                            setMobile(
                              formatMobile(
                                e.target.value
                              )
                            )
                          }
                          placeholder="81254 21544"
                        />

                      </div>
                    </div>


                    {/* PASSWORD */}
                    <div className="field">
                      <label>
                        {lang === "en"
                          ? "Password"
                          : "పాస్‌వర్డ్"}{" "}
                        *
                      </label>

                      <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        placeholder={
                          lang === "en"
                            ? "Minimum 6 characters"
                            : "కనీసం 6 అక్షరాలు"
                        }
                      />
                    </div>


                    {/* CONFIRM PASSWORD */}
                    <div className="field">
                      <label>
                        {lang === "en"
                          ? "Confirm Password"
                          : "పాస్‌వర్డ్ నిర్ధారించండి"}{" "}
                        *
                      </label>

                      <input
                        type="password"
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder={
                          lang === "en"
                            ? "Re-enter password"
                            : "పాస్‌వర్డ్ మళ్లీ నమోదు చేయండి"
                        }
                      />

                      {confirmPassword &&
                        password !==
                          confirmPassword && (
                          <div className="hint error">
                            {lang === "en"
                              ? "Passwords do not match."
                              : "పాస్‌వర్డ్‌లు సరిపోలడం లేదు."}
                          </div>
                        )}
                    </div>


                    <div className="btn-row">

                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          setSignupStep(1)
                        }
                      >
                        ← {t.back}
                      </button>

                      <button
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          justifyContent:
                            "center",
                        }}
                        disabled={!canSend}
                        onClick={sendOtp}
                      >
                        {lang === "en"
                          ? "Register & Send OTP"
                          : "నమోదు చేసి OTP పంపండి"}
                      </button>

                    </div>

                  </>
                )}


              {/* SIGN IN */}
              {!isFarmerSignup && (
                <>

                  <div className="field">

                    <div className="field-glass-label">
                      <label>
                        {t.mobileNumber} *
                      </label>
                    </div>

                    <div className="phone-glass">

                      <span className="phone-flag">
                        🇮🇳 +91
                      </span>

                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(e) =>
                          setMobile(
                            formatMobile(
                              e.target.value
                            )
                          )
                        }
                        placeholder="81254 21544"
                      />

                    </div>

                  </div>


                  {/* PASSWORD */}
                  <div className="field">
                    <label>
                      {lang === "en"
                        ? "Password"
                        : "పాస్‌వర్డ్"}{" "}
                      *
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder={
                        lang === "en"
                          ? "Enter your password"
                          : "మీ పాస్‌వర్డ్ నమోదు చేయండి"
                      }
                    />
                  </div>


                  <button
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent:
                        "center",
                    }}
                    disabled={!canSend}
                    onClick={sendOtp}
                  >
                    {t.sendOtp}
                  </button>

                </>
              )}


              {/* SECONDARY SIGNUP LINK */}
              {role === "farmer" && (
                <div className="login-secondary">

                  {authMode === "signin" ? (
                    <>
                      {lang === "en"
                        ? "New farmer?"
                        : "కొత్త రైతా?"}{" "}

                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();

                          setAuthMode(
                            "signup"
                          );

                          setSignupStep(1);

                          setPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        {lang === "en"
                          ? "Create an account"
                          : "ఖాతా సృష్టించండి"}
                      </a>
                    </>
                  ) : (
                    <>
                      {lang === "en"
                        ? "Already registered?"
                        : "ఇప్పటికే నమోదు అయ్యారా?"}{" "}

                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();

                          setAuthMode(
                            "signin"
                          );

                          setPassword("");
                          setConfirmPassword("");
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

            /* =================================================
               OTP SCREEN
               ================================================= */

            <>

              <div
                className="hint ok"
                style={{
                  marginBottom: 10,
                }}
              >
                ✓{" "}
                {t.otpSentTo(
                  "+91 " + mobile
                )}
              </div>


              <label>
                {t.enterOtp}
              </label>


              <div className="otp-row">

                {otp.map((value, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] =
                        element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={value}
                    onChange={(e) =>
                      handleOtpChange(
                        index,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        index,
                        e
                      )
                    }
                    onPaste={
                      handleOtpPaste
                    }
                    onFocus={(e) =>
                      e.target.select()
                    }
                  />
                ))}

              </div>


              <button
                className="btn btn-primary"
                style={{
                  width: "100%",
                  justifyContent:
                    "center",
                  marginTop: 14,
                }}
                disabled={otp.some(
                  (digit) => !digit
                )}
                onClick={handleLogin}
              >
                {t.verify}
              </button>


              <div className="login-secondary">

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();

                    setOtpSent(false);

                    setOtp([
                      "",
                      "",
                      "",
                      "",
                      "",
                      "",
                    ]);
                  }}
                >
                  ←{" "}
                  {lang === "en"
                    ? "Change number"
                    : "నంబర్ మార్చండి"}
                </a>

              </div>

            </>
          )}


          {/* LANGUAGE */}
          <div
            className="lang-toggle-glass"
            style={{
              margin: "14px 0 0 0",
            }}
          >

            <button
              className={
                lang === "en"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLang("en")
              }
            >
              🇬🇧 English
            </button>

            <button
              className={
                lang === "te"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLang("te")
              }
            >
              🇮🇳 తెలుగు
            </button>

          </div>


          {/* FOOTER */}
          <div className="login-footer">
            <span className="dot"></span>

            {lang === "en"
              ? "Digital Agriculture Infrastructure System"
              : "డిజిటల్ వ్యవసాయ మౌలిక సదుపాయ వ్యవస్థ"}
          </div>

        </div>
      </div>
    </div>
  );
}