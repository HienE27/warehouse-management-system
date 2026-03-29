// src/app/(dashboard)/members/page.tsx
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';
import {
    searchUsers,
    deleteUser,
    type User,
    type UserPage,
} from '@/services/user.service';
import { getAllRoles, type Role } from '@/services/role.service';
import BulkAssignRolesDialog from '@/components/members/BulkAssignRolesDialog';
import ImportUsersDialog from '@/components/members/ImportUsersDialog';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function QuanLyThanhVien() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const { user } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.MEMBER_CREATE);
    const canEdit = hasPermission(userRoles, PERMISSIONS.MEMBER_EDIT);
    const canDelete = hasPermission(userRoles, PERMISSIONS.MEMBER_DELETE);

    const [searchUsername, setSearchUsername] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
    const [filterRoleId, setFilterRoleId] = useState<number | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
    const [exportLoading, setExportLoading] = useState<string | null>(null);
    const [showImportDialog, setShowImportDialog] = useState(false);

    // Debounce search inputs (500ms)
    const debouncedSearchUsername = useDebounce(searchUsername, 500);
    const debouncedSearchEmail = useDebounce(searchEmail, 500);
    const debouncedSearchPhone = useDebounce(searchPhone, 500);

    // Fetch roles for filter
    const { data: roles = [] } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: () => getAllRoles(),
        staleTime: 5 * 60 * 1000,
    });

    // React Query for data fetching
    const {
        data: pageData,
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<UserPage, Error>({
        queryKey: ['users', debouncedSearchUsername, debouncedSearchEmail, debouncedSearchPhone, filterActive, filterRoleId, currentPage],
        queryFn: async ({ signal }) => {
            const result = await searchUsers({
                username: debouncedSearchUsername || undefined,
                email: debouncedSearchEmail || undefined,
                phone: debouncedSearchPhone || undefined,
                active: filterActive,
                roleId: filterRoleId,
                page: currentPage - 1, // Backend dùng 0-based
                size: PAGE_SIZE,
            });
            return result;
        },
        staleTime: 30 * 1000, // 30 seconds stale time
        gcTime: 5 * 60 * 1000, // 5 minutes cache time
        placeholderData: (previousData) => previousData ?? undefined, // Giữ data cũ trong khi fetch trang mới
    });

    const data = useMemo(() => pageData?.content || [], [pageData?.content]);
    const totalPages = pageData?.totalPages ?? 1;
    const totalItems = pageData?.totalElements ?? 0;
    const loading = isLoading || (isFetching && currentPage === 1);
    const paginationLoading = isFetching && currentPage > 1;
    const error = queryError instanceof Error ? queryError.message : null;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteUser(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            showToast.success('Xóa thành viên thành công');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Xóa thành viên thất bại';
            showToast.error(message);
        },
    });

    // Sử dụng hook usePagination với scroll preservation
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

    const handleDelete = useCallback(
        (id: number, username: string) => {
            confirm({
                title: 'Xác nhận xóa',
                message: `Bạn có chắc chắn muốn xóa thành viên "${username}"?`,
                variant: 'danger',
                confirmText: 'Xóa',
                cancelText: 'Hủy',
                onConfirm: () => {
                    deleteMutation.mutate(id);
                },
            });
        },
        [confirm, deleteMutation],
    );

    const handleResetFilter = useCallback(() => {
        setSearchUsername('');
        setSearchEmail('');
        setSearchPhone('');
        setFilterActive(undefined);
        setFilterRoleId(undefined);
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

    // Export functions
    const handleExportExcel = useCallback(async () => {
        try {
            setExportLoading('excel');
            const XLSX = await import('xlsx');
            
            // Fetch all users (or current filtered data)
            const allUsers = await searchUsers({
                username: debouncedSearchUsername || undefined,
                email: debouncedSearchEmail || undefined,
                phone: debouncedSearchPhone || undefined,
                active: filterActive,
                roleId: filterRoleId,
                page: 0,
                size: 10000, // Large size to get all
            });

            const exportData = allUsers.content.map((user, index) => ({
                'STT': index + 1,
                'Tên đăng nhập': user.username,
                'Họ': user.firstName || '',
                'Tên': user.lastName || '',
                'Email': user.email || '',
                'Số điện thoại': user.phone || '',
                'Địa chỉ': user.address || '',
                'Vai trò': user.roles?.join(', ') || '',
                'Trạng thái': user.active ? 'Hoạt động' : 'Ngừng hoạt động',
                'Ngày tạo': user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : '',
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_sach_thanh_vien');
            
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `danh-sach-thanh-vien-${date}.xlsx`);
            showToast.success('Xuất Excel thành công!');
        } catch (err) {
            showToast.error('Xuất Excel thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    }, [debouncedSearchUsername, debouncedSearchEmail, debouncedSearchPhone, filterActive, filterRoleId]);

    const handleExportCSV = useCallback(async () => {
        try {
            setExportLoading('csv');
            const allUsers = await searchUsers({
                username: debouncedSearchUsername || undefined,
                email: debouncedSearchEmail || undefined,
                phone: debouncedSearchPhone || undefined,
                active: filterActive,
                roleId: filterRoleId,
                page: 0,
                size: 10000,
            });

            const headers = ['STT', 'Tên đăng nhập', 'Họ', 'Tên', 'Email', 'Số điện thoại', 'Địa chỉ', 'Vai trò', 'Trạng thái', 'Ngày tạo'];
            const csvRows = [
                headers.join(','),
                ...allUsers.content.map((user, index) => [
                    index + 1,
                    `"${user.username}"`,
                    `"${user.firstName || ''}"`,
                    `"${user.lastName || ''}"`,
                    `"${user.email || ''}"`,
                    `"${user.phone || ''}"`,
                    `"${user.address || ''}"`,
                    `"${user.roles?.join(', ') || ''}"`,
                    user.active ? 'Hoạt động' : 'Ngừng hoạt động',
                    user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : '',
                ].join(',')),
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `danh-sach-thanh-vien-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast.success('Xuất CSV thành công!');
        } catch (err) {
            showToast.error('Xuất CSV thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    }, [debouncedSearchUsername, debouncedSearchEmail, debouncedSearchPhone, filterActive, filterRoleId]);

    // Bulk selection handlers
    const handleSelectAll = useCallback(() => {
        if (selectedUserIds.size === data.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(data.map((u) => u.id)));
        }
    }, [data, selectedUserIds.size]);

    const handleSelectUser = useCallback((userId: number) => {
        setSelectedUserIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    }, []);

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (userIds: number[]) => {
            // Delete users one by one (backend doesn't have bulk delete yet)
            await Promise.all(userIds.map((id) => deleteUser(id)));
        },
        onSuccess: async (_, userIds) => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            const deletedCount = userIds.length; // Lưu trước khi clear
            setSelectedUserIds(new Set());
            showToast.success(`Xóa ${deletedCount} thành viên thành công`);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Xóa thành viên thất bại';
            showToast.error(message);
        },
    });

    const handleBulkDelete = useCallback(() => {
        if (selectedUserIds.size === 0) {
            showToast.error('Vui lòng chọn ít nhất một thành viên');
            return;
        }

        confirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa ${selectedUserIds.size} thành viên đã chọn?`,
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            onConfirm: () => {
                bulkDeleteMutation.mutate(Array.from(selectedUserIds));
            },
        });
    }, [selectedUserIds, confirm, bulkDeleteMutation]);

    const startIndex = useMemo(() => {
        return (pagedPage - 1) * PAGE_SIZE;
    }, [pagedPage]);

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Quản lý thành viên</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý thành viên hệ thống</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <FilterSection
                    error={error}
                    onRetry={handleRetry}
                    loading={loading}
                    onClearFilter={handleResetFilter}
                    onCreateNew={canCreate ? () => router.push('/members/create') : undefined}
                    createButtonText="Thêm mới thành viên"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        {/* Tên đăng nhập */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Tên đăng nhập
                            </label>
                            <input
                                type="text"
                                value={searchUsername}
                                onChange={(e) => setSearchUsername(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                placeholder="Nhập tên đăng nhập"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                placeholder="Nhập email"
                            />
                        </div>

                        {/* Số điện thoại */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Số điện thoại
                            </label>
                            <input
                                type="text"
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                placeholder="Nhập số điện thoại"
                            />
                        </div>

                        {/* Vai trò */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Vai trò
                            </label>
                            <div className="relative">
                                <select
                                    value={filterRoleId === undefined ? 'ALL' : String(filterRoleId)}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilterRoleId(value === 'ALL' ? undefined : Number(value));
                                    }}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                >
                                    <option value="ALL" className="bg-white">Tất cả</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id} className="bg-white">
                                            {role.displayName || role.roleCode}
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Trạng thái */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Trạng thái
                            </label>
                            <div className="relative">
                                <select
                                    value={filterActive === undefined ? 'ALL' : filterActive ? 'ACTIVE' : 'INACTIVE'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilterActive(value === 'ALL' ? undefined : value === 'ACTIVE');
                                    }}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                >
                                    <option value="ALL" className="bg-white">Tất cả</option>
                                    <option value="ACTIVE" className="bg-white">Đang hoạt động</option>
                                    <option value="INACTIVE" className="bg-white">Ngừng hoạt động</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleExportExcel}
                            disabled={exportLoading !== null || loading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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
                                        <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Xuất Excel
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={exportLoading !== null || loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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
                                        <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Xuất CSV
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowImportDialog(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2V10M8 2L5 5M8 2L11 5M2 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Nhập từ file
                        </button>
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
                    </div>
                </FilterSection>

                {/* Bulk Actions Toolbar */}
                {selectedUserIds.size > 0 && (
                    <div className="px-6 py-3 bg-blue-50 border-b border-blue-gray-200 flex items-center justify-between">
                        <div className="text-sm text-blue-gray-700">
                            Đã chọn <span className="font-bold">{selectedUserIds.size}</span> thành viên
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowBulkAssignDialog(true)}
                                className="px-4 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg text-sm transition-colors"
                            >
                                Gán vai trò
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteMutation.isPending}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bulkDeleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                            </button>
                            <button
                                onClick={() => setSelectedUserIds(new Set())}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="px-6 pb-6">
                    <VirtualTable
                        columns={[
                            { 
                                key: 'select', 
                                label: (
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.size === data.length && data.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                    />
                                ), 
                                align: 'center' 
                            },
                            { key: 'stt', label: 'STT', align: 'center' },
                            { key: 'username', label: 'Tên đăng nhập', align: 'left' },
                            { key: 'fullName', label: 'Họ tên', align: 'left' },
                            { key: 'email', label: 'Email', align: 'left' },
                            { key: 'phone', label: 'Số điện thoại', align: 'center' },
                            { key: 'roles', label: 'Vai trò', align: 'center' },
                            { key: 'active', label: 'Trạng thái', align: 'center' },
                            { key: 'actions', label: 'Thao tác', align: 'center' },
                        ]}
                        data={data as unknown as Record<string, unknown>[]}
                        loading={loading || paginationLoading}
                        emptyMessage="Không có thành viên nào"
                        emptyTitle="Không có dữ liệu"
                        startIndex={startIndex}
                        rowHeight={48}
                        viewportHeight={560}
                        renderRow={(record, index) => {
                            const user = record as unknown as User;
                            return (
                                <>
                                    <td className="px-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.has(user.id)}
                                            onChange={() => handleSelectUser(user.id)}
                                            className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                        />
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800 font-medium">
                                        {user.username}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800">
                                        {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-600">
                                        {user.email || '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                        {user.phone || '-'}
                                    </td>
                                    <td className="px-4 text-center">
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {user.roles && user.roles.length > 0 ? (
                                                user.roles.slice(0, 2).map((role, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {role}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-blue-gray-400">-</span>
                                            )}
                                            {user.roles && user.roles.length > 2 && (
                                                <span className="text-xs text-blue-gray-500">
                                                    +{user.roles.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 text-center">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                                                user.active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {user.active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                        </span>
                                    </td>
                                    <td className="px-4">
                                        <ActionButtons
                                            onView={() => router.push(`/members/detail/${user.id}`)}
                                            onEdit={canEdit ? () => router.push(`/members/edit/${user.id}`) : undefined}
                                            onDelete={canDelete ? () => handleDelete(user.id, user.username) : undefined}
                                            disabled={deleteMutation.isPending}
                                        />
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

            {/* Bulk Assign Roles Dialog */}
            <BulkAssignRolesDialog
                userIds={Array.from(selectedUserIds)}
                isOpen={showBulkAssignDialog}
                onClose={() => {
                    setShowBulkAssignDialog(false);
                    setSelectedUserIds(new Set());
                }}
            />

            {/* Import Users Dialog */}
            <ImportUsersDialog
                isOpen={showImportDialog}
                onClose={() => {
                    setShowImportDialog(false);
                }}
            />
        </>
    );
}

