// src/app/(dashboard)/members/activity-logs/page.tsx
 'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { searchActivityLogs, getActivityLogById, deleteActivityLog, deleteActivityLogsBulk, getActivityLogStatistics, type ActivityLog, type PageResponse, type ActivityLogStatistics } from '@/services/activity-log.service';
import { searchUsers, type User } from '@/services/user.service';
import { hasRole } from '@/lib/permissions';

// Helper function to get action badge color
const getActionBadgeColor = (action: string) => {
    const actionColors: Record<string, { bg: string; text: string }> = {
        'LOGIN': { bg: 'bg-green-100', text: 'text-green-800' },
        'LOGOUT': { bg: 'bg-gray-100', text: 'text-gray-800' },
        'CREATE_USER': { bg: 'bg-blue-100', text: 'text-blue-800' },
        'UPDATE_USER': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        'DELETE_USER': { bg: 'bg-red-100', text: 'text-red-800' },
        'RESET_PASSWORD': { bg: 'bg-orange-100', text: 'text-orange-800' },
        'CREATE_ROLE': { bg: 'bg-purple-100', text: 'text-purple-800' },
        'UPDATE_ROLE': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
        'DELETE_ROLE': { bg: 'bg-red-100', text: 'text-red-800' },
        'UPDATE_ROLE_PERMISSIONS': { bg: 'bg-pink-100', text: 'text-pink-800' },
        'UPDATE_USER_PERMISSIONS': { bg: 'bg-pink-100', text: 'text-pink-800' },
        'CREATE_PERMISSION': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
        'UPDATE_PERMISSION': { bg: 'bg-teal-100', text: 'text-teal-800' },
        'DELETE_PERMISSION': { bg: 'bg-red-100', text: 'text-red-800' },
        // Warehouse / order actions
        'CREATE_ORDER': { bg: 'bg-green-100', text: 'text-green-800' },
        'UPDATE_ORDER': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        'CANCEL_ORDER': { bg: 'bg-red-100', text: 'text-red-800' },
        'APPROVE_ORDER': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
        'CREATE_RECEIPT': { bg: 'bg-purple-100', text: 'text-purple-800' },
        'APPROVE_RECEIPT': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
        'CREATE_DELIVERY': { bg: 'bg-purple-50', text: 'text-purple-800' },
        'APPROVE_DELIVERY': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
        'CREATE_INVOICE': { bg: 'bg-cyan-50', text: 'text-cyan-800' },
        'APPROVE_INVOICE': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    };
    return actionColors[action] || { bg: 'bg-gray-100', text: 'text-gray-800' };
};

// Helper function to get action label
const getActionLabel = (action: string) => {
    const actionLabels: Record<string, string> = {
        'LOGIN': 'Đăng nhập',
        'LOGOUT': 'Đăng xuất',
        'CREATE_USER': 'Tạo thành viên',
        'UPDATE_USER': 'Cập nhật thành viên',
        'DELETE_USER': 'Xóa thành viên',
        'RESET_PASSWORD': 'Đặt lại mật khẩu',
        'CREATE_ROLE': 'Tạo vai trò',
        'UPDATE_ROLE': 'Cập nhật vai trò',
        'DELETE_ROLE': 'Xóa vai trò',
        'UPDATE_ROLE_PERMISSIONS': 'Cập nhật phân quyền vai trò',
        'UPDATE_USER_PERMISSIONS': 'Cập nhật phân quyền thành viên',
        'CREATE_PERMISSION': 'Tạo quyền',
        'UPDATE_PERMISSION': 'Cập nhật quyền',
        'DELETE_PERMISSION': 'Xóa quyền',
        // Warehouse / order actions
        'CREATE_ORDER': 'Tạo phiếu',
        'UPDATE_ORDER': 'Cập nhật phiếu',
        'CANCEL_ORDER': 'Hủy phiếu',
        'APPROVE_ORDER': 'Duyệt phiếu',
        'CREATE_RECEIPT': 'Tạo phiếu nhập',
        'APPROVE_RECEIPT': 'Duyệt phiếu nhập',
        'CONFIRM_RECEIPT': 'Xác nhận phiếu nhập',
        'REJECT_RECEIPT': 'Từ chối phiếu nhập',
        'CANCEL_RECEIPT': 'Hủy phiếu nhập',
        'FAILED_LOGIN': 'Đăng nhập thất bại',
        'LOCK_ACCOUNT': 'Tài khoản bị khóa',
        'CREATE_DELIVERY': 'Tạo phiếu xuất',
        'APPROVE_DELIVERY': 'Duyệt phiếu xuất',
        'CREATE_INVOICE': 'Tạo hóa đơn',
        'APPROVE_INVOICE': 'Duyệt hóa đơn',
        // Inventory check actions
        'CREATE_INVENTORY_CHECK': 'Tạo phiếu kiểm kê',
        'APPROVE_INVENTORY_CHECK': 'Duyệt phiếu kiểm kê',
        'CONFIRM_INVENTORY_CHECK': 'Xác nhận phiếu kiểm kê',
        'REJECT_INVENTORY_CHECK': 'Từ chối phiếu kiểm kê',
    };
    return actionLabels[action] || action;
};

// Helper format details (support Before/After JSON)
const FIELD_LABELS_VI: Record<string, string> = {
    username: 'Tên đăng nhập',
    firstName: 'Họ',
    lastName: 'Tên',
    email: 'Email',
    phone: 'Số điện thoại',
    address: 'Địa chỉ',
    province: 'Tỉnh/Thành phố',
    district: 'Quận/Huyện',
    ward: 'Phường/Xã',
    country: 'Quốc gia',
    active: 'Kích hoạt',
    roleCode: 'Mã vai trò',
    displayName: 'Tên hiển thị',
    permissionCodes: 'Quyền',
};

const translatePlainDetails = (details: string, action?: string) => {
    // common phrase replacements
    const replacements: Array<[RegExp, string]> = [
        [/Created new user:\s*(.+)/i, 'Tạo thành viên: $1'],
        [/Deleted user:\s*(.+)/i, 'Xóa thành viên: $1'],
        [/Created new role:\s*(.+)/i, 'Tạo vai trò: $1'],
        [/Deleted role:\s*(.+)/i, 'Xóa vai trò: $1'],
        [/Updated permissions for role:\s*(.+)/i, 'Cập nhật phân quyền vai trò: $1'],
        [/Updated direct permissions for user:\s*(.+)/i, 'Cập nhật phân quyền trực tiếp cho thành viên: $1'],
        [/Updated user information/i, 'Cập nhật thông tin thành viên'],
        [/User logged in successfully/i, 'Đăng nhập'],
        [/User logged out/i, 'Đăng xuất'],
        [/Failed login attempt/i, 'Đăng nhập thất bại'],
        [/Reset password for user:\s*(.+)/i, 'Đặt lại mật khẩu cho thành viên: $1'],
        [/Password reset requested/i, 'Yêu cầu đặt lại mật khẩu'],
        [/Account locked until (.+) due to too many failed login attempts/i, 'Tài khoản bị khóa đến $1 do quá nhiều lần đăng nhập thất bại'],
        // Inventory / receipt phrases
        [/Created import:\s*(.+)/i, 'Tạo phiếu nhập: $1'],
        [/Approved import:\s*(.+)/i, 'Duyệt phiếu nhập: $1'],
        [/Confirmed import:\s*(.+)/i, 'Xác nhận phiếu nhập: $1'],
        [/Rejected import:\s*(.+)/i, 'Từ chối phiếu nhập: $1'],
        [/Cancelled import:\s*(.+)/i, 'Hủy phiếu nhập: $1'],
        [/Created inventory check:\s*(.+)/i, 'Tạo phiếu kiểm kê: $1'],
        [/Approved inventory check:\s*(.+)/i, 'Duyệt phiếu kiểm kê: $1'],
        [/Confirmed inventory check:\s*(.+)/i, 'Xác nhận phiếu kiểm kê: $1'],
        [/Rejected inventory check:\s*(.+)/i, 'Từ chối phiếu kiểm kê: $1'],
    ];

    for (const [rx, rep] of replacements) {
        if (rx.test(details)) {
            return details.replace(rx, rep);
        }
    }

    // fallback: if action code is known, provide a short vi summary
    if (action) {
        const actionToDefault: Record<string, string> = {
            LOGIN: 'Đăng nhập',
            LOGOUT: 'Đăng xuất',
            CREATE_USER: 'Tạo thành viên',
            UPDATE_USER: 'Cập nhật thành viên',
            DELETE_USER: 'Xóa thành viên',
            RESET_PASSWORD: 'Đặt lại mật khẩu',
            CREATE_ROLE: 'Tạo vai trò',
            UPDATE_ROLE: 'Cập nhật vai trò',
            DELETE_ROLE: 'Xóa vai trò',
            UPDATE_ROLE_PERMISSIONS: 'Cập nhật phân quyền vai trò',
            UPDATE_USER_PERMISSIONS: 'Cập nhật phân quyền thành viên',
        };
        if (actionToDefault[action]) {
            return actionToDefault[action] + (details ? ` — ${details}` : '');
        }
    }

    return details;
};

const formatDetailsForDisplay = (details?: string | null, action?: string) => {
    if (!details) return '-';

    // Try parse JSON for structured changes
    try {
        const parsed = JSON.parse(details) as {
            changes?: Record<string, { before: unknown; after: unknown }>;
        };

        if (parsed?.changes && Object.keys(parsed.changes).length > 0) {
            const parts = Object.entries(parsed.changes).map(([field, diff]) => {
                const label = FIELD_LABELS_VI[field] || field;
                const before = diff.before === null || diff.before === undefined ? '-' : String(diff.before);
                const after = diff.after === null || diff.after === undefined ? '-' : String(diff.after);
                return `${label}: ${before} → ${after}`;
            });

            return parts.join('; ');
        }
    } catch {
        // not JSON, fall through to plain translation
    }

    // Translate common English phrases into Vietnamese where possible
    return translatePlainDetails(details, action);
};

// Helper: extract a human-friendly display name from log.displayName / details JSON (fallback to username)
const getDisplayNameFromDetails = (log: { username?: string; details?: string | null; displayName?: string | null }) => {
    if (!log) return '-';
    // Prefer explicit displayName from backend if provided
    if (log.displayName && typeof log.displayName === 'string' && log.displayName.trim().length > 0) {
        return log.displayName;
    }
    if (log.details) {
        try {
            const parsed = JSON.parse(log.details) as Record<string, unknown>;
            const nameKeys = ['displayName', 'fullName', 'createdByName', 'approvedByName', 'importedByName', 'importedBy'];
            for (const k of nameKeys) {
                const v = parsed[k];
                if (v && typeof v === 'string' && v.trim().length > 0) return v as string;
            }
            // If details contains changes object, try to pick a meaningful after value
            if (parsed.changes && typeof parsed.changes === 'object') {
                const changes = parsed.changes as Record<string, { before?: unknown; after?: unknown; value?: unknown }>;
                for (const diff of Object.values(changes)) {
                    const after = diff && (diff.after ?? diff.value);
                    if (after && (typeof after === 'string' || typeof after === 'number')) return String(after);
                }
            }
        } catch {
            // ignore non-JSON details
        }
    }
    return log.username || '-';
};

export default function NhatKyHoatDong() {
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [memberInput, setMemberInput] = useState<string>('');
    const [actionInput, setActionInput] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [keyword, setKeyword] = useState<string>('');
    const [ipAddress, setIpAddress] = useState<string>('');
    const [userAgent, setUserAgent] = useState<string>('');
    const [showUserSuggestions, setShowUserSuggestions] = useState<boolean>(false);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [showActionSuggestions, setShowActionSuggestions] = useState<boolean>(false);
    const [filteredActions, setFilteredActions] = useState<{ value: string; label: string }[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [exportLoading, setExportLoading] = useState<'excel' | 'csv' | 'pdf' | null>(null);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showStatistics, setShowStatistics] = useState(false);
    const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set());
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    const queryClient = useQueryClient();

    // Fetch users for filter
    const { data: usersData } = useQuery<PageResponse<User>, Error>({
        queryKey: ['users', 'all'],
        queryFn: () => searchUsers({ page: 0, size: 100 }),
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    // Update filtered suggestions when inputs or data change
    useEffect(() => {
        const users = usersData?.content ?? [];
        const q = (memberInput || '').trim().toLowerCase();
        if (!q) {
            setFilteredUsers(users.slice(0, 10));
        } else {
            setFilteredUsers(
                users.filter(u =>
                    (u.fullName && u.fullName.toLowerCase().includes(q)) ||
                    (u.username && u.username.toLowerCase().includes(q))
                ).slice(0, 20)
            );
        }
    }, [memberInput, usersData]);

    const actionOptions = useMemo(() => [
        { value: '', label: 'Tất cả' },
        { value: 'LOGIN', label: 'Đăng nhập' },
        { value: 'LOGOUT', label: 'Đăng xuất' },
        { value: 'CREATE_USER', label: 'Tạo thành viên' },
        { value: 'UPDATE_USER', label: 'Cập nhật thành viên' },
        { value: 'DELETE_USER', label: 'Xóa thành viên' },
        { value: 'RESET_PASSWORD', label: 'Đặt lại mật khẩu' },
        { value: 'CREATE_ROLE', label: 'Tạo vai trò' },
        { value: 'UPDATE_ROLE', label: 'Cập nhật vai trò' },
        { value: 'DELETE_ROLE', label: 'Xóa vai trò' },
        { value: 'UPDATE_ROLE_PERMISSIONS', label: 'Cập nhật phân quyền vai trò' },
        { value: 'UPDATE_USER_PERMISSIONS', label: 'Cập nhật phân quyền thành viên' },
        { value: 'CREATE_PERMISSION', label: 'Tạo quyền' },
        { value: 'UPDATE_PERMISSION', label: 'Cập nhật quyền' },
        { value: 'DELETE_PERMISSION', label: 'Xóa quyền' },
        // Warehouse / order actions
        { value: 'CREATE_ORDER', label: 'Tạo phiếu' },
        { value: 'UPDATE_ORDER', label: 'Cập nhật phiếu' },
        { value: 'CANCEL_ORDER', label: 'Hủy phiếu' },
        { value: 'APPROVE_ORDER', label: 'Duyệt phiếu' },
        { value: 'CREATE_RECEIPT', label: 'Tạo phiếu nhập' },
        { value: 'APPROVE_RECEIPT', label: 'Duyệt phiếu nhập' },
        { value: 'CREATE_DELIVERY', label: 'Tạo phiếu xuất' },
        { value: 'APPROVE_DELIVERY', label: 'Duyệt phiếu xuất' },
        { value: 'CREATE_INVOICE', label: 'Tạo hóa đơn' },
        { value: 'APPROVE_INVOICE', label: 'Duyệt hóa đơn' },
    ], []);

    useEffect(() => {
        const q = (actionInput || '').trim().toLowerCase();
        if (!q) {
            setFilteredActions(actionOptions.slice(0, 10));
        } else {
            setFilteredActions(
                actionOptions.filter(a => a.label.toLowerCase().includes(q) || a.value.toLowerCase().includes(q)).slice(0, 20)
            );
        }
    }, [actionInput, actionOptions]);
    
    // React Query for data fetching
    const {
        data: pageData,
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<PageResponse<ActivityLog>, Error>({
        queryKey: ['activity-logs', selectedUserId, selectedAction, startDate, endDate, ipAddress, userAgent, keyword, currentPage],
        queryFn: async () => {
            try {
                // combine free-text inputs into keyword when appropriate
                const parts: string[] = [];
                if (keyword && keyword.trim()) parts.push(keyword.trim());
                // if memberInput provided but not resolved to selectedUserId, include in keyword
                if (memberInput && memberInput.trim() && !selectedUserId) parts.push(memberInput.trim());
                // if actionInput provided but not resolved to selectedAction, include in keyword
                if (actionInput && actionInput.trim() && !selectedAction) parts.push(actionInput.trim());
                const combinedKeyword = parts.length > 0 ? parts.join(' ') : undefined;

                const result = await searchActivityLogs({
                    userId: selectedUserId,
                    action: selectedAction || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    ipAddress: ipAddress || undefined,
                    userAgent: userAgent || undefined,
                    keyword: combinedKeyword,
                    page: currentPage - 1,
                    size: PAGE_SIZE,
                });
                return result;
            } catch (err: unknown) {
                const errorMessage = err instanceof Error 
                    ? err.message 
                    : (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string')
                        ? err.message
                        : 'Không thể tải dữ liệu. Vui lòng thử lại.';
                toast.error(errorMessage);
                throw err;
            }
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
    });

    // Load user roles từ sessionStorage (đã được Sidebar cache profile)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const cachedProfile = window.sessionStorage.getItem('userProfile');
            if (!cachedProfile) return;
            const profile = JSON.parse(cachedProfile) as { roles?: string[] };
            if (Array.isArray(profile.roles)) {
                setUserRoles(profile.roles);
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to parse user profile from sessionStorage:', e);
            }
        }
    }, []);

    const canDeleteLogs = useMemo(
        () => hasRole(userRoles, ['ADMIN']),
        [userRoles]
    );

    // Auto-refresh mỗi 30 giây khi bật
    useEffect(() => {
        if (!autoRefresh) return;

        const intervalId = setInterval(() => {
            refetch();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [autoRefresh, refetch]);

    const data = useMemo(() => (pageData as PageResponse<ActivityLog> | undefined)?.content || [], [pageData]);
    const totalPages = (pageData as PageResponse<ActivityLog> | undefined)?.totalPages ?? 1;
    const totalItems = (pageData as PageResponse<ActivityLog> | undefined)?.totalElements ?? 0;
    const loading = isLoading || (isFetching && currentPage === 1);
    const paginationLoading = isFetching && currentPage > 1;
    const error = queryError instanceof Error ? queryError.message : null;

    // Pagination hook
    const { currentPage: pagedPage, handlePageChange, resetPage } = usePagination({
        itemsPerPage: PAGE_SIZE,
        totalItems,
        totalPages,
        onPageChange: (page) => {
            setCurrentPage(page);
        },
    });

    // Sync currentPage với pagedPage
    useEffect(() => {
        if (pagedPage !== currentPage) {
            setCurrentPage(pagedPage);
        }
    }, [pagedPage, currentPage]);

    // Statistics query
    const { data: statistics, isLoading: statisticsLoading } = useQuery<ActivityLogStatistics>({
        queryKey: ['activity-logs-statistics', startDate, endDate],
        queryFn: () => getActivityLogStatistics(startDate || undefined, endDate || undefined),
        enabled: showStatistics,
        staleTime: 60 * 1000, // 1 minute
    });

    // Security alerts: failed logins & locked accounts trong ngày hiện tại
    const todayDate = useMemo(() => {
        const d = new Date();
        // Lấy yyyy-MM-dd theo múi giờ local
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const { data: failedToday } = useQuery<PageResponse<ActivityLog>>({
        queryKey: ['activity-logs-failed-today', todayDate],
        queryFn: () =>
            searchActivityLogs({
                action: 'FAILED_LOGIN',
                startDate: todayDate,
                page: 0,
                size: 1,
            }),
        staleTime: 60 * 1000,
    });

    const { data: lockedToday } = useQuery<PageResponse<ActivityLog>>({
        queryKey: ['activity-logs-locked-today', todayDate],
        queryFn: () =>
            searchActivityLogs({
                action: 'LOCK_ACCOUNT',
                startDate: todayDate,
                page: 0,
                size: 1,
            }),
        staleTime: 60 * 1000,
    });

    const failedTodayCount = failedToday?.totalElements ?? 0;
    const lockedTodayCount = lockedToday?.totalElements ?? 0;
    const showSecurityAlert = failedTodayCount >= 5 || lockedTodayCount > 0;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteActivityLog,
        onSuccess: () => {
            toast.success('Đã xóa nhật ký hoạt động thành công');
            queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
            setShowDeleteConfirm(null);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            const errorMessage = message || 'Không thể xóa nhật ký hoạt động';
            toast.error(errorMessage);
        },
    });

    // Bulk delete mutation with fallback to individual deletes
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            try {
                // Try bulk delete first
                await deleteActivityLogsBulk(ids);
                return { method: 'bulk', ids };
            } catch (bulkError) {
                // If bulk delete fails (404 or other), fallback to individual deletes
                const errorMessage = bulkError instanceof Error ? bulkError.message : String(bulkError);
                const is404 = errorMessage.includes('404') || errorMessage.includes('Not Found');
                
                // Nếu bulk delete 404, thử individual delete
                if (is404) {
                    console.warn('Bulk delete endpoint not found (404), trying individual deletes...');
                    // Fallback: delete one by one
                    const results = await Promise.allSettled(
                        ids.map(id => deleteActivityLog(id))
                    );
                    const failed: number[] = [];
                    let succeeded = 0;
                    
                    results.forEach((result, index) => {
                        if (result.status === 'fulfilled') {
                            succeeded++;
                        } else {
                            failed.push(ids[index]);
                        }
                    });
                    
                    // Nếu tất cả đều fail với 404, có thể backend chưa có endpoint
                    if (failed.length === ids.length) {
                        const all404 = results.every(r => 
                            r.status === 'rejected' && 
                            (String(r.reason).includes('404') || String(r.reason).includes('Not Found'))
                        );
                        if (all404) {
                            throw new Error('Backend endpoint không tồn tại. Vui lòng kiểm tra backend đã được deploy và restart chưa.');
                        }
                    }
                    
                    if (failed.length > 0) {
                        throw new Error(`Đã xóa ${succeeded}/${ids.length} nhật ký. ${failed.length} nhật ký không thể xóa.${failed.length > 0 ? ` (IDs: ${failed.join(', ')})` : ''}`);
                    }
                    return { method: 'individual', ids, count: succeeded };
                }
                throw bulkError;
            }
        },
        onSuccess: (result, ids) => {
            if (result.method === 'individual' && result.count !== undefined) {
                toast.success(`Đã xóa ${result.count} nhật ký hoạt động thành công (sử dụng phương thức xóa từng cái)`);
            } else {
                toast.success(`Đã xóa ${ids.length} nhật ký hoạt động thành công`);
            }
            queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
            setSelectedLogIds(new Set());
            setShowBulkDeleteConfirm(false);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            let errorMessage = message || 'Không thể xóa nhật ký hoạt động';
            
            // Nếu là 404, thông báo rõ ràng hơn
            if (message.includes('404') || message.includes('Not Found') || message.includes('không tồn tại')) {
                errorMessage = 'Backend endpoint không tồn tại. Vui lòng kiểm tra:\n1. Backend đã được deploy và restart chưa?\n2. Endpoint DELETE /api/activity-logs/{id} và /api/activity-logs/bulk có tồn tại không?';
            }
            
            toast.error(errorMessage);
            console.error('Bulk delete error:', err);
        },
    });

    const handleViewDetail = useCallback(async (logId: number) => {
        try {
            const log = await getActivityLogById(logId);
            setSelectedLog(log);
            setShowDetailModal(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const errorMessage = message || 'Không thể tải chi tiết';
            toast.error(errorMessage);
        }
    }, []);

    const handleDelete = useCallback((logId: number) => {
        setShowDeleteConfirm(logId);
    }, []);

    const handleBulkDelete = useCallback(() => {
        if (selectedLogIds.size === 0) {
            toast.error('Vui lòng chọn ít nhất một nhật ký để xóa');
            return;
        }
        setShowBulkDeleteConfirm(true);
    }, [selectedLogIds.size]);

    const handleToggleSelect = useCallback((logId: number) => {
        setSelectedLogIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedLogIds.size === data.length) {
            setSelectedLogIds(new Set());
        } else {
            setSelectedLogIds(new Set(data.map(log => log.id)));
        }
    }, [data, selectedLogIds.size]);

    const handleResetFilter = useCallback(() => {
        setSelectedUserId(undefined);
        setSelectedAction('');
        setStartDate('');
        setEndDate('');
        setIpAddress('');
        setUserAgent('');
        setKeyword('');
        setCurrentPage(1);
        resetPage();
    }, [resetPage]);

    const handleSearch = useCallback(() => {
        setCurrentPage(1);
        resetPage();
        refetch();
    }, [refetch, resetPage]);

    const handleRetry = useCallback(() => {
        refetch();
    }, [refetch]);

    const startIndex = useMemo(() => {
        return (pagedPage - 1) * PAGE_SIZE;
    }, [pagedPage]);

    const FILTER_STORAGE_KEY = 'activityLogsFilters';

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(FILTER_STORAGE_KEY) : null;
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved.userId !== undefined) {
                setSelectedUserId(saved.userId);
            }
            if (saved.action !== undefined) {
                setSelectedAction(saved.action);
            }
            if (saved.startDate !== undefined) {
                setStartDate(saved.startDate);
            }
            if (saved.endDate !== undefined) {
                setEndDate(saved.endDate);
            }
            if (saved.ipAddress !== undefined) {
                setIpAddress(saved.ipAddress);
            }
            if (saved.userAgent !== undefined) {
                setUserAgent(saved.userAgent);
            }
            if (saved.keyword !== undefined) {
                setKeyword(saved.keyword);
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to load saved activity log filters:', e);
            }
        }
    }, []);

    const handleSaveFilters = useCallback(() => {
        try {
            const payload = {
                userId: selectedUserId,
                action: selectedAction,
                startDate,
                endDate,
                ipAddress,
                userAgent,
                keyword,
            };
            localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
            toast.success('Đã lưu bộ lọc hiện tại');
        } catch (e) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to save activity log filters:', e);
            }
            toast.error('Không thể lưu bộ lọc, vui lòng thử lại');
        }
    }, [selectedUserId, selectedAction, startDate, endDate, ipAddress, userAgent, keyword]);

    // Export functions
    const handleExportExcel = useCallback(async () => {
        try {
            setExportLoading('excel');
            const XLSX = await import('xlsx');
            
            // Fetch all logs with current filters
            const allLogs = await searchActivityLogs({
                userId: selectedUserId,
                action: selectedAction || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                ipAddress: ipAddress || undefined,
                userAgent: userAgent || undefined,
                page: 0,
                size: 10000, // Large size to get all
            }) as PageResponse<ActivityLog>;

            const exportData = allLogs.content.map((log, index) => ({
                'STT': index + 1,
                'Thời gian': new Date(log.createdAt).toLocaleString('vi-VN'),
                'Thành viên': getDisplayNameFromDetails(log),
                'Hành động': log.actionLabel ? log.actionLabel : getActionLabel(log.action),
                'Loại tài nguyên': log.resourceType || '',
                'Tên tài nguyên': log.resourceName || '',
                'Chi tiết': formatDetailsForDisplay(log.details, log.action),
                'IP Address': log.ipAddress || '',
                'User Agent': log.userAgent || '',
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhat_ky_hoat_dong');
            
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `nhat-ky-hoat-dong-${date}.xlsx`);
            toast.success('Xuất Excel thành công!');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (process.env.NODE_ENV === 'development') {
                console.warn('Export Excel error:', message);
            }
            toast.error('Xuất Excel thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    }, [selectedUserId, selectedAction, startDate, endDate, ipAddress, userAgent]);

    const handleExportCSV = useCallback(async () => {
        try {
            setExportLoading('csv');
            const allLogs = await searchActivityLogs({
                userId: selectedUserId,
                action: selectedAction || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                ipAddress: ipAddress || undefined,
                userAgent: userAgent || undefined,
                page: 0,
                size: 10000,
            }) as PageResponse<ActivityLog>;

            const headers = ['STT', 'Thời gian', 'Thành viên', 'Hành động', 'Loại tài nguyên', 'Tên tài nguyên', 'Chi tiết', 'IP Address', 'User Agent'];
            const csvRows = [
                headers.join(','),
                ...allLogs.content.map((log: ActivityLog, index: number) => [
                    index + 1,
                    `"${new Date(log.createdAt).toLocaleString('vi-VN')}"`,
                    `"${getDisplayNameFromDetails(log)}"`,
                    `"${log.actionLabel ? log.actionLabel : getActionLabel(log.action)}"`,
                    `"${log.resourceType || ''}"`,
                    `"${log.resourceName || ''}"`,
                    `"${formatDetailsForDisplay(log.details, log.action).replace(/"/g, '""')}"`,
                    `"${log.ipAddress || ''}"`,
                    `"${log.userAgent || ''}"`,
                ].join(',')),
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `nhat-ky-hoat-dong-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Xuất CSV thành công!');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (process.env.NODE_ENV === 'development') {
                console.warn('Export CSV error:', message);
            }
            toast.error('Xuất CSV thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    }, [selectedUserId, selectedAction, startDate, endDate, ipAddress, userAgent]);

    // Export PDF
    const handleExportPDF = useCallback(async () => {
        try {
            setExportLoading('pdf');
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            
            const allLogs = await searchActivityLogs({
                userId: selectedUserId,
                action: selectedAction || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                ipAddress: ipAddress || undefined,
                userAgent: userAgent || undefined,
                page: 0,
                size: 10000,
            }) as PageResponse<ActivityLog>;

            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(18);
            doc.text('Nhật ký hoạt động', 14, 20);
            doc.setFontSize(12);
            doc.text(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`, 14, 30);
            
            // Table data
            const tableData = allLogs.content.map((log: ActivityLog, index: number) => [
                index + 1,
                new Date(log.createdAt).toLocaleString('vi-VN'),
                getDisplayNameFromDetails(log),
                log.actionLabel ? log.actionLabel : getActionLabel(log.action),
                log.resourceName || log.resourceType || '-',
                formatDetailsForDisplay(log.details, log.action),
            ]);

            autoTable(doc, {
                head: [['STT', 'Thời gian', 'Thành viên', 'Hành động', 'Tài nguyên', 'Chi tiết']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [0, 153, 255] },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`nhat-ky-hoat-dong-${date}.pdf`);
            toast.success('Xuất PDF thành công!');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (process.env.NODE_ENV === 'development') {
                console.warn('Export PDF error:', message);
            }
            toast.error('Xuất PDF thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    }, [selectedUserId, selectedAction, startDate, endDate, ipAddress, userAgent]);

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Nhật ký hoạt động</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Theo dõi hoạt động của thành viên</p>
            </div>

            {/* Security Alert */}
            {showSecurityAlert && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-3">
                    <svg
                        className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 4a1 1 0 0 0-.993.883L9 7v4a1 1 0 0 0 1.993.117L11 11V7a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 14z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div>
                        <div className="font-semibold mb-1">Cảnh báo bảo mật</div>
                        <p>
                            Hôm nay có <span className="font-semibold">{failedTodayCount}</span> lần đăng nhập thất bại
                            {lockedTodayCount > 0 && (
                                <>
                                    {' '}và <span className="font-semibold">{lockedTodayCount}</span> tài khoản đã bị khóa tạm thời
                                </>
                            )}
                            . Vui lòng kiểm tra các bản ghi <code className="font-mono">FAILED_LOGIN</code> và{' '}
                            <code className="font-mono">LOCK_ACCOUNT</code> trong nhật ký hoạt động.
                        </p>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <FilterSection
                    error={error}
                    onRetry={handleRetry}
                    loading={loading}
                    onClearFilter={handleResetFilter}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Thành viên */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Thành viên
                            </label>
                            <div className="relative">
                                {/* Member input with custom styled suggestions */}
                                <input
                                    value={memberInput}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setMemberInput(v);
                                        setShowUserSuggestions(true);
                                        const found = usersData?.content?.find(u =>
                                            u.username === v ||
                                            u.fullName === v ||
                                            (u.fullName && `${u.fullName} (${u.username})` === v)
                                        );
                                        if (found) setSelectedUserId(found.id);
                                        else setSelectedUserId(undefined);
                                    }}
                                    onFocus={() => setShowUserSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowUserSuggestions(false), 120)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setCurrentPage(1);
                                            refetch();
                                        }
                                    }}
                                    placeholder="Nhập tên hoặc username, chọn gợi ý hoặc để trống..."
                                    className="w-full px-4 py-2 pr-10 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                />
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>

                                {showUserSuggestions && filteredUsers.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-blue-gray-100 rounded-md shadow-lg z-50 max-h-56 overflow-auto">
                                        {filteredUsers.map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onMouseDown={(ev) => {
                                                    ev.preventDefault();
                                                    const label = u.fullName ? `${u.fullName} (${u.username})` : u.username;
                                                    setMemberInput(label);
                                                    setSelectedUserId(u.id);
                                                    setShowUserSuggestions(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50"
                                            >
                                                <div className="text-sm font-medium text-blue-gray-800">{u.fullName || u.username}</div>
                                                <div className="text-xs text-blue-gray-500">{u.username}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hành động */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Hành động
                            </label>
                            <div className="relative">
                                {/* Action input with custom styled suggestions */}
                                <input
                                    value={actionInput}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setActionInput(v);
                                        setShowActionSuggestions(true);
                                        const found = actionOptions.find(a => a.label === v || a.value === v);
                                        if (found) setSelectedAction(found.value);
                                        else setSelectedAction('');
                                    }}
                                    onFocus={() => setShowActionSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowActionSuggestions(false), 120)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setCurrentPage(1);
                                            refetch();
                                        }
                                    }}
                                    placeholder="Chọn hoặc gõ hành động..."
                                    className="w-full px-4 py-2 pr-10 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                />
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>

                                {showActionSuggestions && filteredActions.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-blue-gray-100 rounded-md shadow-lg z-50 max-h-56 overflow-auto">
                                        {filteredActions.map((a) => (
                                            <button
                                                key={a.value}
                                                type="button"
                                                onMouseDown={(ev) => {
                                                    ev.preventDefault();
                                                    setActionInput(a.label);
                                                    setSelectedAction(a.value);
                                                    setShowActionSuggestions(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50"
                                            >
                                                <div className="text-sm font-medium text-blue-gray-800">{a.label}</div>
                                                <div className="text-xs text-blue-gray-500">{a.value}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Từ ngày */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Từ ngày
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                            />
                        </div>

                        {/* Đến ngày */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Đến ngày
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                            />
                        </div>
                        {/* Từ khóa (full-text search) */}
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Từ khóa
                            </label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm theo tên user, tài nguyên, chi tiết..."
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                            />
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="text-sm text-[#0099FF] hover:text-[#0088EE] flex items-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={showAdvancedFilters ? 'rotate-180' : ''}>
                                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {showAdvancedFilters ? 'Ẩn bộ lọc nâng cao' : 'Hiển thị bộ lọc nâng cao'}
                        </button>
                        
                        {showAdvancedFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-gray-200">
                                {/* IP Address */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        IP Address
                                    </label>
                                    <input
                                        type="text"
                                        value={ipAddress}
                                        onChange={(e) => setIpAddress(e.target.value)}
                                        placeholder="Nhập IP address..."
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                </div>

                                {/* User Agent */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        User Agent
                                    </label>
                                    <input
                                        type="text"
                                        value={userAgent}
                                        onChange={(e) => setUserAgent(e.target.value)}
                                        placeholder="Nhập user agent..."
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center gap-3">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStatistics(!showStatistics)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 2L10 6L14 7L10 8L8 12L6 8L2 7L6 6L8 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                                {showStatistics ? 'Ẩn thống kê' : 'Thống kê'}
                            </button>
                            {canDeleteLogs && selectedLogIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleteMutation.isPending}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 4V2C4 1.4 4.4 1 5 1H11C11.6 1 12 1.4 12 2V4M14 4H2M6 7.5V11.5M10 7.5V11.5M3 4V13.5C3 14.3 3.7 15 4.5 15H11.5C12.3 15 13 14.3 13 13.5V4H3Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                    Xóa ({selectedLogIds.size})
                                </button>
                            )}
                            <button
                                onClick={handleExportExcel}
                                disabled={loading || exportLoading !== null}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {exportLoading === 'excel' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang xuất...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Xuất Excel
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleExportCSV}
                                disabled={loading || exportLoading !== null}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {exportLoading === 'csv' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang xuất...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Xuất CSV
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleExportPDF}
                                disabled={loading || exportLoading !== null}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {exportLoading === 'pdf' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang xuất...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Xuất PDF
                                    </>
                                )}
                            </button>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed border border-[#0099FF]"
                            disabled={loading || paginationLoading}
                        >
                            {(loading || paginationLoading) ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {loading ? 'Đang tải...' : 'Đang tìm kiếm...'}
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                                        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Tìm kiếm
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveFilters}
                            className="px-4 py-2 bg-white text-[#0099FF] border border-[#0099FF] rounded-lg transition-colors flex items-center gap-2 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={loading || paginationLoading}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4H12V12H4V4Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                            </svg>
                            Lưu bộ lọc
                        </button>
                        <div className="flex items-center gap-2 text-xs text-blue-gray-600">
                            <span>Tự động làm mới mỗi 30 giây</span>
                            <button
                                type="button"
                                onClick={() => setAutoRefresh((prev) => !prev)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    autoRefresh ? 'bg-[#0099FF]' : 'bg-blue-gray-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                        autoRefresh ? 'translate-x-4' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </FilterSection>

                {/* Statistics Section */}
                {showStatistics && (
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-blue-gray-200">
                        {statisticsLoading ? (
                            <div className="text-center py-4">
                                <svg className="animate-spin h-6 w-6 mx-auto text-purple-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        ) : statistics ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-blue-gray-600 mb-1">Tổng số</div>
                                    <div className="text-2xl font-bold text-blue-gray-800">{statistics.totalLogs.toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-blue-gray-600 mb-1">Thành viên</div>
                                    <div className="text-2xl font-bold text-blue-gray-800">{statistics.totalUsers.toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-blue-gray-600 mb-1">Hôm nay</div>
                                    <div className="text-2xl font-bold text-green-600">{statistics.todayLogs.toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-blue-gray-600 mb-1">7 ngày</div>
                                    <div className="text-2xl font-bold text-blue-600">{statistics.weekLogs.toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-sm text-blue-gray-600 mb-1">30 ngày</div>
                                    <div className="text-2xl font-bold text-purple-600">{statistics.monthLogs.toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm col-span-2">
                                    <div className="text-sm text-blue-gray-600 mb-2">Hành động phổ biến</div>
                                    <div className="space-y-1">
                                        {Object.entries(statistics.actionCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 3)
                                            .map(([action, count]) => (
                                                <div key={action} className="flex justify-between text-sm">
                                                    <span className="text-blue-gray-700">{getActionLabel(action)}</span>
                                                    <span className="font-semibold text-blue-gray-800">{count}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Table */}
                <div className="px-6 pb-6">
                    <VirtualTable
                        columns={[
                            ...(canDeleteLogs ? [{
                                key: 'select',
                                label: (
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={data.length > 0 && selectedLogIds.size === data.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-[#0099FF] border-blue-gray-300 rounded focus:ring-[#0099FF] cursor-pointer"
                                            title="Chọn tất cả"
                                        />
                                    </div>
                                ),
                                align: 'center' as const
                            }] : []),
                            { key: 'stt', label: 'STT', align: 'center' as const },
                            { key: 'timestamp', label: 'Thời gian', align: 'left' as const },
                            { key: 'username', label: 'Thành viên', align: 'left' as const },
                            { key: 'action', label: 'Hành động', align: 'left' as const },
                            { key: 'resource', label: 'Tài nguyên', align: 'left' as const },
                            { key: 'details', label: 'Chi tiết', align: 'left' as const },
                            { key: 'actions', label: 'Thao tác', align: 'center' as const },
                        ]}
                        data={data as unknown as Record<string, unknown>[]}
                        loading={loading || paginationLoading}
                        emptyMessage="Không có hoạt động nào"
                        emptyTitle="Không có dữ liệu"
                        startIndex={startIndex}
                        rowHeight={48}
                        viewportHeight={560}
                        renderRow={(record, index) => {
                            const log = record as unknown as ActivityLog;
                            const isSelected = selectedLogIds.has(log.id);
                            return (
                                <>
                                    {canDeleteLogs && (
                                        <td className="px-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(log.id)}
                                                className="w-4 h-4 text-[#0099FF] border-blue-gray-300 rounded focus:ring-[#0099FF]"
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-600">
                                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800 font-medium">
                                        <div
                                            title={
                                                log.username && getDisplayNameFromDetails(log) !== log.username
                                                    ? log.username
                                                    : undefined
                                            }
                                            className={log.username && getDisplayNameFromDetails(log) !== log.username ? 'cursor-help' : ''}
                                        >
                                            <div>{getDisplayNameFromDetails(log)}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800">
                                        {(() => {
                                            const colors = getActionBadgeColor(log.action);
                                            return (
                                                <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                    {log.actionLabel ? log.actionLabel : getActionLabel(log.action)}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-600">
                                        {log.resourceName || log.resourceType || '-'}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-600">
                                        {formatDetailsForDisplay(log.details, log.action)}
                                    </td>
                                    <td className="px-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleViewDetail(log.id)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 3C5.5 3 3.5 5 3.5 7.5C3.5 10 5.5 12 8 12C10.5 12 12.5 10 12.5 7.5C12.5 5 10.5 3 8 3ZM8 10.5C6.6 10.5 5.5 9.4 5.5 8C5.5 6.6 6.6 5.5 8 5.5C9.4 5.5 10.5 6.6 10.5 8C10.5 9.4 9.4 10.5 8 10.5ZM8 6.5C7.2 6.5 6.5 7.2 6.5 8C6.5 8.8 7.2 9.5 8 9.5C8.8 9.5 9.5 8.8 9.5 8C9.5 7.2 8.8 6.5 8 6.5Z" fill="currentColor" />
                                                </svg>
                                            </button>
                                            {canDeleteLogs && (
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Xóa"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M5.5 2V1C5.5 0.7 5.7 0.5 6 0.5H10C10.3 0.5 10.5 0.7 10.5 1V2H13.5C13.8 2 14 2.2 14 2.5C14 2.8 13.8 3 13.5 3H2.5C2.2 3 2 2.8 2 2.5C2 2.2 2.2 2 2.5 2H5.5ZM4 4V13.5C4 14.3 4.7 15 5.5 15H10.5C11.3 15 12 14.3 12 13.5V4H4Z" fill="currentColor" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </>
                            );
                        }}
                    />

                    {!error && totalItems > 0 && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={pagedPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={PAGE_SIZE}
                                onPageChange={handlePageChange}
                                loading={paginationLoading}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-blue-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-blue-gray-800">Chi tiết nhật ký hoạt động</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-1 text-blue-gray-400 hover:text-blue-gray-600 rounded transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">ID</label>
                                    <p className="text-sm text-blue-gray-800 mt-1">{selectedLog.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">Thời gian</label>
                                    <p className="text-sm text-blue-gray-800 mt-1">{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">Thành viên</label>
                                    <p
                                        className="text-sm text-blue-gray-800 mt-1"
                                        title={
                                            selectedLog.username && getDisplayNameFromDetails(selectedLog) !== selectedLog.username
                                                ? selectedLog.username
                                                : undefined
                                        }
                                    >
                                        {getDisplayNameFromDetails(selectedLog)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">Hành động</label>
                                    <div className="mt-1">
                                        {(() => {
                                            const colors = getActionBadgeColor(selectedLog.action);
                                            return (
                                                <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                    {selectedLog.actionLabel ? selectedLog.actionLabel : getActionLabel(selectedLog.action)}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">Loại tài nguyên</label>
                                    <p className="text-sm text-blue-gray-800 mt-1">{selectedLog.resourceType || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-gray-600">Tên tài nguyên</label>
                                    <p className="text-sm text-blue-gray-800 mt-1">{selectedLog.resourceName || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-blue-gray-600">Chi tiết</label>
                                    {(() => {
                                        let parsedDetails: Record<string, unknown> | null = null;
                                        try {
                                            parsedDetails = selectedLog.details ? JSON.parse(selectedLog.details) as Record<string, unknown> : null;
                                        } catch {
                                            parsedDetails = null;
                                        }

                                        const changes = parsedDetails?.changes as
                                            | Record<string, { before: unknown; after: unknown }>
                                            | undefined;

                                        if (changes && Object.keys(changes).length > 0) {
                                            return (
                                                <div className="mt-2 border border-blue-gray-100 rounded-lg overflow-hidden text-sm">
                                                    <table className="w-full">
                                                        <thead className="bg-blue-gray-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-semibold text-blue-gray-600">
                                                                    Trường
                                                                </th>
                                                                <th className="px-3 py-2 text-left text-xs font-semibold text-blue-gray-600">
                                                                    Trước
                                                                </th>
                                                                <th className="px-3 py-2 text-left text-xs font-semibold text-blue-gray-600">
                                                                    Sau
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(changes).map(([field, diff]) => (
                                                                <tr
                                                                    key={field}
                                                                    className="border-t border-blue-gray-100"
                                                                >
                                                                    <td className="px-3 py-2 font-medium text-blue-gray-800">
                                                                        {field}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-blue-gray-600">
                                                                        {diff.before === null ||
                                                                        diff.before === undefined
                                                                            ? '-'
                                                                            : String(diff.before)}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-blue-gray-600">
                                                                        {diff.after === null || diff.after === undefined
                                                                            ? '-'
                                                                            : String(diff.after)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        }

                                        return (
                                            <p className="text-sm text-blue-gray-800 mt-1">
                                                {selectedLog.details || '-'}
                                            </p>
                                        );
                                    })()}
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-blue-gray-600">IP Address</label>
                                    <p className="text-sm text-blue-gray-800 mt-1 font-mono">{selectedLog.ipAddress || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-blue-gray-600">User Agent</label>
                                    <p className="text-sm text-blue-gray-800 mt-1 break-all">{selectedLog.userAgent || '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-blue-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Single Modal */}
            {showDeleteConfirm !== null && (
                <div
                    className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowDeleteConfirm(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-blue-gray-200">
                            <h3 className="text-lg font-semibold text-blue-gray-800">Xác nhận xóa</h3>
                        </div>
                        <div className="p-6 space-y-2">
                            <p className="text-sm text-blue-gray-700">
                                Bạn có chắc chắn muốn xóa nhật ký hoạt động có ID{' '}
                                <span className="font-semibold">{showDeleteConfirm}</span>?
                            </p>
                            <p className="text-xs text-red-500">
                                Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="p-6 border-t border-blue-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => showDeleteConfirm !== null && deleteMutation.mutate(showDeleteConfirm)}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-60"
                            >
                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Bulk Delete Modal */}
            {showBulkDeleteConfirm && selectedLogIds.size > 0 && (
                <div
                    className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-blue-gray-200">
                            <h3 className="text-lg font-semibold text-blue-gray-800">Xác nhận xóa nhiều nhật ký</h3>
                        </div>
                        <div className="p-6 space-y-2">
                            <p className="text-sm text-blue-gray-700">
                                Bạn có chắc chắn muốn xóa{' '}
                                <span className="font-semibold">{selectedLogIds.size}</span> nhật ký hoạt động đã chọn?
                            </p>
                            <p className="text-xs text-red-500">
                                Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="p-6 border-t border-blue-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedLogIds))}
                                disabled={bulkDeleteMutation.isPending}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-60"
                            >
                                {bulkDeleteMutation.isPending ? 'Đang xóa...' : 'Xóa tất cả'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

