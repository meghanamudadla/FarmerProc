const API_BASE_URL = "http://127.0.0.1:8000";

export async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
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
