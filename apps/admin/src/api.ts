import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LOGIN_PATH = `${BASE}/login`;

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      if (location.pathname !== LOGIN_PATH) location.href = LOGIN_PATH;
    }
    return Promise.reject(err);
  },
);
