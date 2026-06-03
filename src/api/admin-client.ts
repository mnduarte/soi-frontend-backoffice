import axios from 'axios';
import { useAdminAuthStore } from '../store/admin-auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const adminClient = axios.create({ baseURL: API_URL });

adminClient.interceptors.request.use(config => {
  const token = useAdminAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAdminAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
