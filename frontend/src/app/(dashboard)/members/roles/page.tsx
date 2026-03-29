// src/app/(dashboard)/members/roles/page.tsx
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
    getAllRoles,
    deleteRole,
    type Role,
} from '@/services/role.service';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function QuanLyVaiTro() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const { user } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.ROLE_CREATE);
    const canEdit = hasPermission(userRoles, PERMISSIONS.ROLE_EDIT);
    const canDelete = hasPermission(userRoles, PERMISSIONS.ROLE_DELETE);

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Debounce search input (500ms)
    const debouncedSearch = useDebounce(search, 500);

    // React Query for data fetching
    const {
        data: roles = [],
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<Role[]>({
        queryKey: ['roles', debouncedSearch],
        queryFn: async ({ signal }) => {
            const result = await getAllRoles(debouncedSearch || undefined);
            return result;
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    // Pagination logic
    const totalItems = roles.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return roles.slice(start, end);
    }, [roles, currentPage]);

    const loading = isLoading || isFetching;
    const error = queryError instanceof Error ? queryError.message : null;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteRole(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['roles'] });
            showToast.success('Xóa vai trò thành công');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Xóa vai trò thất bại';
            showToast.error(message);
        },
    });

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
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setCurrentPage(pagedPage), 0);
        }
    }, [pagedPage, currentPage]);

    const handleDelete = useCallback(
        (id: number, roleName: string) => {
            confirm({
                title: 'Xác nhận xóa',
                message: `Bạn có chắc chắn muốn xóa vai trò "${roleName}"?`,
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
        setSearch('');
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

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Quản lý vai trò</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý vai trò hệ thống</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <FilterSection
                    error={error}
                    onRetry={handleRetry}
                    loading={loading}
                    onClearFilter={handleResetFilter}
                    onCreateNew={canCreate ? () => router.push('/members/roles/create') : undefined}
                    createButtonText="Thêm mới vai trò"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Tìm kiếm */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Tìm kiếm
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                placeholder="Tìm theo mã hoặc tên vai trò"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed border border-[#0099FF]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang tải...
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

                {/* Table */}
                <div className="px-6 pb-6">
                    <VirtualTable
                        columns={[
                            { key: 'stt', label: 'STT', align: 'center' },
                            { key: 'roleCode', label: 'Mã vai trò', align: 'left' },
                            { key: 'displayName', label: 'Tên hiển thị', align: 'left' },
                            { key: 'description', label: 'Mô tả', align: 'left' },
                            { key: 'permissions', label: 'Số quyền', align: 'center' },
                            { key: 'actions', label: 'Thao tác', align: 'center' },
                        ]}
                        data={paginatedData as unknown as Record<string, unknown>[]}
                        loading={loading}
                        emptyMessage="Không có vai trò nào"
                        emptyTitle="Không có dữ liệu"
                        startIndex={startIndex}
                        rowHeight={48}
                        viewportHeight={560}
                        renderRow={(record, index) => {
                            const role = record as unknown as Role;
                            return (
                                <>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800 font-medium">
                                        {role.roleCode}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-800">
                                        {role.displayName || '-'}
                                    </td>
                                    <td className="px-4 text-sm text-blue-gray-600">
                                        {role.description || '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                        {role.permissions?.length || 0}
                                    </td>
                                    <td className="px-4">
                                        <ActionButtons
                                            onView={() => router.push(`/members/roles/detail/${role.id}`)}
                                            onEdit={canEdit ? () => router.push(`/members/roles/edit/${role.id}`) : undefined}
                                            onDelete={canDelete ? () => handleDelete(role.id, role.displayName || role.roleCode) : undefined}
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
                                loading={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

