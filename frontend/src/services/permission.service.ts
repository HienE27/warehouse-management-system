// src/services/permission.service.ts
import { apiFetch } from '@/lib/api-client';

export interface Permission {
  id: number;
  permissionCode: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getAllPermissions(
  search?: string
): Promise<Permission[]> {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);

  const response = await apiFetch<ApiResponse<Permission[]>>(
    `/api/permissions?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

export async function getPermissionById(id: number): Promise<Permission> {
  const response = await apiFetch<ApiResponse<Permission>>(`/api/permissions/${id}`, {
    method: 'GET',
  });
  return response.data;
}

export async function getPermissionByCode(code: string): Promise<Permission> {
  const response = await apiFetch<ApiResponse<Permission>>(`/api/permissions/code/${code}`, {
    method: 'GET',
  });
  return response.data;
}

export interface CreatePermissionRequest {
  permissionCode: string;
  displayName?: string;
}

export interface UpdatePermissionRequest {
  permissionCode?: string;
  displayName?: string;
}

export async function createPermission(data: CreatePermissionRequest): Promise<Permission> {
  const response = await apiFetch<ApiResponse<Permission>>('/api/permissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updatePermission(id: number, data: UpdatePermissionRequest): Promise<Permission> {
  const response = await apiFetch<ApiResponse<Permission>>(`/api/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deletePermission(id: number): Promise<void> {
  return apiFetch<void>(`/api/permissions/${id}`, {
    method: 'DELETE',
  });
}

