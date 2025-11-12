import type { ApiResponse } from '@opsflow/types';
import axios from 'axios';

import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Helper function to get auth data from store
const getAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        isAuthenticated: parsed.isAuthenticated,
      };
    }
  } catch (error) {
    console.error('Failed to parse auth storage:', error);
  }
  return { accessToken: null, refreshToken: null, isAuthenticated: false };
};

// Helper function to update auth data in store
const updateAuthInStorage = (updates: { accessToken?: string; refreshToken?: string }) => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const updated = { ...parsed, ...updates };
      localStorage.setItem('auth-storage', JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Failed to update auth storage:', error);
  }
};

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const { accessToken } = getAuthFromStorage();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = getAuthFromStorage();
        if (refreshToken) {
          const response = await api.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;

          // Update both localStorage and Zustand store
          updateAuthInStorage({ accessToken });
          useAuthStore.getState().updateAccessToken(accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth storage and redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/login';
        console.error('Token refresh failed:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Type-safe API response wrapper
export const apiRequest = async <T>(
  request: Promise<{ data: ApiResponse<T> }>
): Promise<ApiResponse<T>> => {
  const response = await request;
  if (!response.data.success) {
    throw new Error(response.data.message || 'API request failed');
  }
  console.log(response.data);

  return response.data!;
};
