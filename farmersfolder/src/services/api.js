const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "https://farmerprocbackend.onrender.com";

export async function apiRequest(endpoint, options = {}) {
  const token =
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL.replace(/\/+$/, "")}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed (${response.status})`;

    try {
      const errorData = await response.json();
      const { detail } = errorData;
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors: [{ loc, msg, type }, ...]
        errorMessage = detail.map((d) => d.msg || JSON.stringify(d)).join("; ") || errorMessage;
      } else if (detail && typeof detail === "object") {
        errorMessage = detail.msg || JSON.stringify(detail);
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getFarmerProfile() {
  return apiRequest("/farmers/me");
}

export async function getMyCrops() {
  return apiRequest("/crops/my");
}

export async function createCrop(cropData) {
  return apiRequest("/crops/", {
    method: "POST",
    body: JSON.stringify(cropData),
  });
}

export async function getMyBookings() {
  return apiRequest("/bookings/my");
}

export async function createBooking(bookingData) {
  return apiRequest("/bookings/", {
    method: "POST",
    body: JSON.stringify(bookingData),
  });
}

export async function getCenters() {
  return apiRequest("/centers/");
}

export async function getCenterSlots(centerId) {
  return apiRequest(`/slots/center/${centerId}`);
}
