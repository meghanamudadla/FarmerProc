const API_BASE_URL = "https://farmerprocbackend.onrender.com";
const TOKEN_KEY = "farmerproc_gov_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function apiRequest(endpoint, options = {}) {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      let errorMsg = `API request error: ${response.statusText}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (err) {
    console.warn(`Backend fetch failed for ${endpoint}:`, err.message);
    throw err;
  }
}

export async function getProcurementAnalytics() {
  return apiRequest("/procurement/analytics");
}

export async function getCenters() {
  return apiRequest("/centers/");
}

export async function getAllProcurements() {
  return apiRequest("/procurement/all");
}

export async function getAllGrievances() {
  return apiRequest("/grievances/all");
}

export async function getAllFarmers() {
  return apiRequest("/farmers/all");
}

export async function getPaymentsSummary() {
  return apiRequest("/procurement/summary");
}

<<<<<<< HEAD
export async function getCenterDetail(centerId) {
  const numericId = String(centerId).replace(/\D/g, "") || 1;
  return apiRequest(`/centers/${numericId}`);
}

export async function getCenterQueue(centerId) {
  const numericId = String(centerId).replace(/\D/g, "") || 1;
  return apiRequest(`/queue/center/${numericId}`);
=======
export async function loginRequest(phone, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export async function updateGrievance(complaintId, data) {
  return apiRequest(`/grievances/${complaintId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
>>>>>>> 01d9a59ab6c541c76d9c353e9788e009e17ddb4d
}
