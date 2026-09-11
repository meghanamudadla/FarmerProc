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