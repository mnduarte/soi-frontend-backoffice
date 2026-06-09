import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminAuthStore {
  accessToken: string | null;
  admin: { email: string; role: string } | null;
  setAuth: (payload: { accessToken: string; admin: { email: string; role: string } }) => void;
  clearAuth: () => void;
}

// Admin session lives in localStorage so a refresh keeps the operator
// logged in. Backend JWT TTL is 24h; once it expires the next request
// 401s and the axios interceptor sends them back to /login.
export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    set => ({
      accessToken: null,
      admin: null,
      setAuth: ({ accessToken, admin }) => set({ accessToken, admin }),
      clearAuth: () => set({ accessToken: null, admin: null }),
    }),
    {
      name: 'soi.admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ accessToken: state.accessToken, admin: state.admin }),
    },
  ),
);
