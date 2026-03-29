// src/services/role.service.ts
import { apiFetch } from '@/lib/api-client';

export interface Role {
  id: number;
  roleCode: string;
  displayName?: string;
  permissions?: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: number;
  permissionCode: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  roleCode: string;
  displayName?: string;
  permissionIds?: number[];
}

export interface UpdateRoleRequest {
  roleCode?: string;
  displayName?: string;
  permissionIds?: number[];
}

export interface UpdateRolePermissionsRequest {
  permissionIds: number[];
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getAllRoles(search?: string): Promise<Role[]> {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);

  const response = await apiFetch<ApiResponse<Role[]>>(
    `/api/roles?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

export async function getRoleById(id: number): Promise<Role> {
  const response = await apiFetch<ApiResponse<Role>>(`/api/roles/${id}`, {
    method: 'GET',
  });
  return response.data;
}

export async function getRoleByCode(code: string): Promise<Role> {
  const response = await apiFetch<ApiResponse<Role>>(`/api/roles/code/${code}`, {
    method: 'GET',
  });
  return response.data;
}

export async function createRole(data: CreateRoleRequest): Promise<Role> {
  const response = await apiFetch<ApiResponse<Role>>('/api/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
  const response = await apiFetch<ApiResponse<Role>>(`/api/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteRole(id: number): Promise<void> {
  return apiFetch<void>(`/api/roles/${id}`, {
    method: 'DELETE',
  });
}

export async function updateRolePermissions(
  roleId: number,
  data: UpdateRolePermissionsRequest
): Promise<Role> {
  const response = await apiFetch<ApiResponse<Role>>(`/api/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

