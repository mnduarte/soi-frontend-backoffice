import { create } from 'zustand';

interface AdminAuthStore {
  accessToken: string | null;
  admin: { email: string; role: string } | null;
  setAuth: (payload: { accessToken: string; admin: { email: string; role: string } }) => void;
  clearAuth: () => void;
}

export const useAdminAuthStore = create<AdminAuthStore>(set => ({
  accessToken: null,
  admin: null,
  setAuth: ({ accessToken, admin }) => set({ accessToken, admin }),
  clearAuth: () => set({ accessToken: null, admin: null }),
}));
