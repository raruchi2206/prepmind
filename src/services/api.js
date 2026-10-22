const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// Auth endpoints never trigger a silent refresh (avoids loops on login/refresh itself)
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];
let refreshPromise = null;

// Concurrent 401s share one /auth/refresh call
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Sends the request; on an expired access token, refreshes once and retries
async function fetchWithRefresh(path, init) {
  const send = () => fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include" });
  let response = await send();
  if (response.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    if (await refreshAccessToken()) {
      response = await send();
    } else {
      window.dispatchEvent(new Event("auth:expired"));
    }
  }
  return response;
}

export async function apiRequest(path, options = {}) {
  const response = await fetchWithRefresh(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload.message || "Request failed",
      response.status,
      payload,
    );
  }
  return payload;
}

export const authApi = {
  register: (body) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    apiRequest("/auth/logout", {
      method: "POST",
    }),
  refresh: () =>
    apiRequest("/auth/refresh", {
      method: "POST",
    }),
  me: () => apiRequest("/auth/me"),
  forgotPassword: (body) =>
    apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyResetOtp: (body) =>
    apiRequest("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resendResetOtp: (body) =>
    apiRequest("/auth/resend-reset-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body) =>
    apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  changePassword: (body) =>
    apiRequest("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export async function apiUpload(path, formData) {
  const response = await fetchWithRefresh(path, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload.message || "Upload failed",
      response.status,
      payload,
    );
  }
  return payload;
}

export const userApi = {
  getMe: () => apiRequest("/users/me"),
  updateProfile: (body) =>
    apiRequest("/users/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const knowledgeApi = {
  getAll: () => apiRequest("/knowledge"),
  getById: (id) => apiRequest(`/knowledge/${id}`),
  create: (body) =>
    apiRequest("/knowledge", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  upload: (formData) => apiUpload("/knowledge/upload", formData),
  importYouTube: (body) =>
    apiRequest("/knowledge/youtube", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiRequest(`/knowledge/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id) =>
    apiRequest(`/knowledge/${id}`, {
      method: "DELETE",
    }),
  process: (id) =>
    apiRequest(`/knowledge/${id}/process`, {
      method: "POST",
    }),
  reindex: (id) =>
    apiRequest(`/knowledge/${id}/reindex`, {
      method: "POST",
    }),
  reindexAll: () =>
    apiRequest("/knowledge/reindex-all", {
      method: "POST",
    }),
  getChunks: (id) => apiRequest(`/knowledge/${id}/chunks`),
};

export const ragApi = {
  retrieve: (body) =>
    apiRequest("/rag/retrieve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ask: (body) =>
    apiRequest("/rag/ask", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateSummary: (body) =>
    apiRequest("/rag/generate/summary", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateNotes: (body) =>
    apiRequest("/rag/generate/notes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateQuiz: (body) =>
    apiRequest("/rag/generate/quiz", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generatePaper: (body) =>
    apiRequest("/rag/generate/paper", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateViva: (body) =>
    apiRequest("/rag/generate/viva", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  evaluateViva: (body) =>
    apiRequest("/rag/evaluate/viva", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAssessment: (id) => apiRequest(`/rag/assessments/${id}`),
  submitAttempt: (id, body) =>
    apiRequest(`/rag/assessments/${id}/attempt`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const historyApi = {
  getAll: () => apiRequest("/history"),
  getById: (id) => apiRequest(`/history/${id}`),
  delete: (id) =>
    apiRequest(`/history/${id}`, {
      method: "DELETE",
    }),
};

export const progressApi = {
  get: () => apiRequest("/progress"),
};

