import { create } from 'zustand';

interface UIStore {
  // Detail drawer is identified by the clinic id. `null` = closed.
  drawerClinicId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;

  // Password-reset inbox drawer.
  resetInboxOpen: boolean;
  openResetInbox: () => void;
  closeResetInbox: () => void;

  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  drawerClinicId: null,
  openDrawer: id => set({ drawerClinicId: id }),
  closeDrawer: () => set({ drawerClinicId: null }),

  resetInboxOpen: false,
  openResetInbox: () => set({ resetInboxOpen: true }),
  closeResetInbox: () => set({ resetInboxOpen: false }),

  toast: null,
  showToast: msg => set({ toast: msg }),
  clearToast: () => set({ toast: null }),
}));
