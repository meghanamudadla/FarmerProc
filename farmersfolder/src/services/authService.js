import { apiRequest } from "./api.js";


/**
 * Whether a phone number already has a backend account.
 *
 * Backend: POST /auth/check-phone
 *
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
export async function isPhoneRegistered(phone) {
  const data = await apiRequest("/auth/check-phone", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return Boolean(data.registered);
}


/**
 * Send a 6-digit OTP to the registered phone number via backend SMS dispatcher.
 *
 * Backend: POST /auth/send-otp
 *
 * @param {string} phone
 * @param {Object} [options]
 * @param {boolean} [options.forLogin]
 * @param {boolean} [options.forSignup]
 * @returns {Promise<Object>}
 */
export async function sendOtpToPhone(phone, { forLogin = false, forSignup = false } = {}) {
  return apiRequest("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({
      phone,
      for_login: Boolean(forLogin),
      for_signup: Boolean(forSignup),
    }),
  });
}


/**
 * Verify entered OTP against backend OTP engine.
 *
 * Backend: POST /auth/verify-otp
 *
 * @param {string} phone
 * @param {string} otp
 * @returns {Promise<Object>}
 */
export async function verifyOtpCode(phone, otp) {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone,
      otp,
    }),
  });
}


/**
 * Login farmer using backend authentication.
 *
 * Backend:
 * POST /auth/login
 *
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<Object>}
 */
export async function loginFarmer(phone, password) {
  if (!phone) {
    throw new Error("Phone number is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      phone,
      password,
    }),
  });

  if (!data.access_token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  // Store JWT for authenticated API requests
  sessionStorage.setItem(
    "access_token",
    data.access_token
  );

  sessionStorage.setItem(
    "token_type",
    data.token_type || "bearer"
  );

  return data;
}


/**
 * Logout farmer.
 */
export function logoutFarmer() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("token_type");
}


/**
 * Check whether a backend JWT exists.
 *
 * @returns {boolean}
 */
export function isBackendAuthenticated() {
  return Boolean(
    sessionStorage.getItem("access_token")
  );
}


/**
 * Get the currently stored access token.
 *
 * @returns {string|null}
 */
export function getAccessToken() {
  return sessionStorage.getItem(
    "access_token"
  );
}