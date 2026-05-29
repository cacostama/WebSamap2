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
      const hadToken = !!localStorage.getItem("token");
      localStorage.removeItem("token");
      // Solo redirigir si realmente había sesión y no estamos ya en /login
      // (evita loops de redirección). location.assign mantiene historial.
      if (hadToken && location.pathname !== LOGIN_PATH) location.assign(LOGIN_PATH);
    }
    return Promise.reject(err);
  },
);
