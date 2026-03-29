// src/services/user.service.ts
import { apiFetch } from '@/lib/api-client';

export interface User {
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
  permissions?: string[]; // Direct permissions (not from roles)
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  active?: boolean;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  active?: boolean;
  roleIds?: number[];
}

export interface SearchUsersParams {
  username?: string;
  email?: string;
  phone?: string;
  active?: boolean;
  roleId?: number;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type UserPage = PageResponse<User>;

export async function searchUsers(params?: SearchUsersParams): Promise<UserPage> {
  const queryParams = new URLSearchParams();
  
  if (params?.username) queryParams.append('username', params.username);
  if (params?.email) queryParams.append('email', params.email);
  if (params?.phone) queryParams.append('phone', params.phone);
  if (params?.active !== undefined) queryParams.append('active', String(params.active));
  if (params?.roleId) queryParams.append('roleId', String(params.roleId));
  if (params?.page !== undefined) queryParams.append('page', String(params.page));
  if (params?.size !== undefined) queryParams.append('size', String(params.size));

  const response = await apiFetch<ApiResponse<UserPage>>(
    `/api/users?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  // Backend trả về PageResponse trong data
  return response.data;
}

export async function getUserById(id: number): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>(`/api/users/${id}`, {
    method: 'GET',
  });
  return response.data;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

export interface ResetPasswordRequest {
  newPassword?: string;
  generateRandomPassword?: boolean;
}

export async function resetUserPassword(id: number, data: ResetPasswordRequest): Promise<string> {
  const response = await apiFetch<ApiResponse<string>>(`/api/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export interface UpdateUserPermissionsRequest {
  permissionIds: number[];
}

export async function updateUserPermissions(
  userId: number,
  data: UpdateUserPermissionsRequest
): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>(`/api/users/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

