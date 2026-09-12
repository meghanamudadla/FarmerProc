<<<<<<< HEAD
const API_BASE_URL = "http://127.0.0.1:8000";

export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "API request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
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
=======
const API_BASE_URL = "https://farmerprocbackend.onrender.com";

export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "API request failed";

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
>>>>>>> 01d9a59ab6c541c76d9c353e9788e009e17ddb4d
