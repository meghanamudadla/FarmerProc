const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://farmerprocbackend.onrender.com";

export function getAuthToken() {
  try {
    return (
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("farmerproc_token") ||
      null
    );
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL.replace(/\/+$/, "")}${cleanEndpoint}`;

  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

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