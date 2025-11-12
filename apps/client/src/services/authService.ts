import type { LoginData, RegisterData, AuthResponse, ApiResponse, AuthToken } from '@opsflow/types';

import { api, apiRequest } from '@/lib/axios';

export const authService = {
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    return apiRequest(api.post('/auth/login', data));
  },
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return apiRequest(api.post('/auth/register', data));
  },
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthToken>> {
    return apiRequest(api.post('/auth/refresh', { refreshToken }));
  },
};
