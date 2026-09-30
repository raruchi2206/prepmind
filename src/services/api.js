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

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
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
  update: (id, body) =>
    apiRequest(`/knowledge/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id) =>
    apiRequest(`/knowledge/${id}`, {
      method: "DELETE",
    }),
};
