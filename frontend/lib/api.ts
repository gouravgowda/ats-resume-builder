/**
 * API client for all backend requests.
 */
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ats_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ats_token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    api.post<{ access_token: string }>("/auth/login", { email, password }),
};

// ── Resumes ──────────────────────────────────────────────────────────────────
export const resumeApi = {
  list: () => api.get("/resumes"),
  get: (id: string) => api.get(`/resumes/${id}`),
  create: (data: unknown) => api.post("/resumes", data),
  updateSections: (id: string, data: unknown) =>
    api.put(`/resumes/${id}/sections`, data),
  delete: (id: string) => api.delete(`/resumes/${id}`),
};

// ── Bullets ──────────────────────────────────────────────────────────────────
export const bulletApi = {
  improve: (resumeId: string, raw_text: string, context?: string) =>
    api.post(`/resumes/${resumeId}/bullets/improve`, { raw_text, context }),
};

// ── Render ────────────────────────────────────────────────────────────────────
export const renderApi = {
  previewHtml: (resumeId: string, template = "clean") =>
    `${API_BASE}/resumes/${resumeId}/preview-html?template=${template}`,
  download: (resumeId: string, format: "pdf" | "docx", template = "clean") =>
    api.post(
      `/resumes/${resumeId}/render`,
      { format, template },
      { responseType: "blob" }
    ),
};

// ── Parse check ───────────────────────────────────────────────────────────────
export const parseCheckApi = {
  run: (resumeId: string) =>
    api.post(`/resumes/${resumeId}/parse-check`),
};

// ── Score ─────────────────────────────────────────────────────────────────────
export const scoreApi = {
  run: (resumeId: string, jd_text?: string) =>
    api.post(`/resumes/${resumeId}/score`, { jd_text }),
};

// ── Tailor ────────────────────────────────────────────────────────────────────
export const tailorApi = {
  run: (resumeId: string, jd_text: string, resume_title?: string) =>
    api.post(`/resumes/${resumeId}/tailor`, { jd_text, resume_title }),
};

// ── Helper: download blob ─────────────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
