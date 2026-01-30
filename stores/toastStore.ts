// Toast notification store
import { create } from 'zustand';
import type { ToastType } from '@/components/common/Toast';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  
  // Actions
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',

  showToast: (message: string, type: ToastType = 'info') => {
    set({ visible: true, message, type });
  },

  hideToast: () => {
    set({ visible: false });
  },

  success: (message: string) => {
    set({ visible: true, message, type: 'success' });
  },

  error: (message: string) => {
    set({ visible: true, message, type: 'error' });
  },

  warning: (message: string) => {
    set({ visible: true, message, type: 'warning' });
  },

  info: (message: string) => {
    set({ visible: true, message, type: 'info' });
  },
}));
