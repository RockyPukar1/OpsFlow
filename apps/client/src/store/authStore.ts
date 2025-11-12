import type { AuthToken, User } from '@opsflow/types';
import { create } from 'zustand';

import { socketService } from '@/lib/socket';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthToken) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        accessToken: parsed.accessToken || null,
        refreshToken: parsed.refreshToken || null,
        isAuthenticated: parsed.isAuthenticated || false,
      };
    }
  } catch (error) {
    console.error('Failed to parse stored auth:', error);
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };
};

const saveAuth = (
  state: Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated'>
) => {
  try {
    localStorage.setItem('auth-storage', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save auth to localStorage:', error);
  }
};

export const useAuthStore = create<AuthState>((set) => {
  const storedAuth = getStoredAuth();

  return {
    ...storedAuth,
    isLoading: false,

    setAuth: (user, tokens) => {
      const newState = {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
      };

      socketService.connect(tokens.accessToken);
      saveAuth(newState);
      set(newState);
    },

    updateAccessToken: (accessToken) => {
      set((state) => {
        const newState = { ...state, accessToken };
        saveAuth({
          user: newState.user,
          accessToken: newState.accessToken,
          refreshToken: newState.refreshToken,
          isAuthenticated: newState.isAuthenticated,
        });
        return newState;
      });
    },

    logout: () => {
      const newState = {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };

      socketService.disconnect();
      localStorage.removeItem('auth-storage');
      set(newState);
    },

    setLoading: (loading) => set({ isLoading: loading }),

    initializeAuth: () => {
      const stored = getStoredAuth();
      if (stored.isAuthenticated && stored.accessToken) {
        socketService.connect(stored.accessToken);
      }
      set(stored);
    },
  };
});
