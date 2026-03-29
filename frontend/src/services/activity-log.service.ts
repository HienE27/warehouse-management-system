// src/services/activity-log.service.ts
import { apiFetch } from '@/lib/api-client';

export interface ActivityLog {
  id: number;
  userId: number;
  username: string;
  displayName?: string;
  action: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: number;
  resourceName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SearchActivityLogsParams {
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  userAgent?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function searchActivityLogs(params?: SearchActivityLogsParams): Promise<PageResponse<ActivityLog>> {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.append('userId', String(params.userId));
  if (params?.action) queryParams.append('action', params.action);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.ipAddress) queryParams.append('ipAddress', params.ipAddress);
  if (params?.userAgent) queryParams.append('userAgent', params.userAgent);
  if (params?.keyword) queryParams.append('keyword', params.keyword);
  if (params?.page !== undefined) queryParams.append('page', String(params.page));
  if (params?.size !== undefined) queryParams.append('size', String(params.size));

  const response = await apiFetch<ApiResponse<PageResponse<ActivityLog>>>(
    `/api/activity-logs?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

export async function getActivityLogById(id: number): Promise<ActivityLog> {
  const response = await apiFetch<ApiResponse<ActivityLog>>(
    `/api/activity-logs/${id}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

export async function deleteActivityLog(id: number): Promise<void> {
  await apiFetch<ApiResponse<string>>(
    `/api/activity-logs/${id}`,
    {
      method: 'DELETE',
    }
  );
}

export async function deleteActivityLogsBulk(ids: number[]): Promise<void> {
  await apiFetch<ApiResponse<string>>(
    `/api/activity-logs/bulk`,
    {
      method: 'DELETE',
      body: JSON.stringify(ids),
    }
  );
}

export interface ActivityLogStatistics {
  totalLogs: number;
  totalUsers: number;
  actionCounts: Record<string, number>;
  topUsers: Record<string, number>;
  todayLogs: number;
  weekLogs: number;
  monthLogs: number;
}

export async function getActivityLogStatistics(
  startDate?: string,
  endDate?: string
): Promise<ActivityLogStatistics> {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const response = await apiFetch<ApiResponse<ActivityLogStatistics>>(
    `/api/activity-logs/statistics?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

export async function getActivityLogsByUserId(
  userId: number,
  page?: number,
  size?: number
): Promise<PageResponse<ActivityLog>> {
  const queryParams = new URLSearchParams();
  if (page !== undefined) queryParams.append('page', String(page));
  if (size !== undefined) queryParams.append('size', String(size));

  const response = await apiFetch<ApiResponse<PageResponse<ActivityLog>>>(
    `/api/activity-logs/user/${userId}?${queryParams.toString()}`,
    {
      method: 'GET',
    }
  );
  return response.data;
}

