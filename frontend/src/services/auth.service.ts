// src/services/auth.service.ts
import { apiFetch } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/auth';

export interface UserProfile {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  active?: boolean;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

type TokenPairResponse = {
  success: boolean;
  message?: string;
  data: { token: string; refreshToken: string };
};

export async function refresh(refreshToken: string): Promise<TokenPairResponse> {
  return apiFetch<TokenPairResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function forgotPassword(email: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithToken(data: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(token: string): Promise<ApiResponse<void>> {
  const query = new URLSearchParams({ token });
  return apiFetch<ApiResponse<void>>(`/api/auth/verify-email?${query.toString()}`, {
    method: 'GET',
  });
}

export async function resendVerification(username: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyUnlockCode(username: string, code: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>('/api/auth/verify-unlock', {
    method: 'POST',
    body: JSON.stringify({ username, code }),
  });
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getProfile(): Promise<UserProfile> {
  const response = await apiFetch<ApiResponse<UserProfile>>('/api/auth/profile', {
    method: 'GET',
  });
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const response = await apiFetch<ApiResponse<UserProfile>>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteAccount(): Promise<void> {
  return apiFetch<void>('/api/auth/profile', {
    method: 'DELETE',
  });
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  const response = await apiFetch<ApiResponse<void>>('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<ApiResponse<void>>('/api/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    // Ignore errors on logout - still clear token even if API call fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('Logout API call failed:', error);
    }
  }
}
