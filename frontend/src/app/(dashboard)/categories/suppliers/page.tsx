// src/app/(dashboard)/categories/suppliers/page.tsx
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
    searchSuppliers,
    deleteSupplier,
    type Supplier,
    type SupplierPage,
} from '@/services/supplier.service';
import { SUPPLIER_TYPE_LABELS } from '@/types/supplier';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function QuanLyNguonHang() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const { user } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.SUPPLIER_CREATE);
    const canEdit = hasPermission(userRoles, PERMISSIONS.SUPPLIER_EDIT);
    const canDelete = hasPermission(userRoles, PERMISSIONS.SUPPLIER_DELETE);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchType, setSearchType] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Debounce search inputs (500ms)
    const debouncedSearchCode = useDebounce(searchCode, 500);
    const debouncedSearchName = useDebounce(searchName, 500);
    const debouncedSearchPhone = useDebounce(searchPhone, 500);

    // React Query for data fetching
    const {
        data: pageData,
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<SupplierPage, Error>({
        queryKey: ['suppliers', debouncedSearchCode, debouncedSearchName, searchType, debouncedSearchPhone, currentPage],
        queryFn: async ({ signal }) => {
            const result = await searchSuppliers({
                code: debouncedSearchCode || undefined,
                name: debouncedSearchName || undefined,
                type: searchType || undefined,
                phone: debouncedSearchPhone || undefined,
                page: currentPage - 1, // Backend dùng 0-based
                size: PAGE_SIZE,
            });
            return result;
        },
        staleTime: 30 * 1000, // 30 seconds stale time
        gcTime: 5 * 60 * 1000, // 5 minutes cache time
        keepPreviousData: true, // Keep previous data while fetching new
    });

    const data = useMemo(() => pageData?.content || [], [pageData?.content]);
    const totalPages = pageData?.totalPages ?? 1;
    const totalItems = pageData?.totalElements ?? 0;
    const loading = isLoading || (isFetching && currentPage === 1);
    const paginationLoading = isFetching && currentPage > 1;
    const error = queryError instanceof Error ? queryError.message : null;

    // Helper function để chuyển đổi type sang tiếng Việt
    const getTypeLabel = useCallback((type: string | null | undefined): string => {
        if (!type) return '-';
        const normalizedType = type.toUpperCase();
        return SUPPLIER_TYPE_LABELS[normalizedType as keyof typeof SUPPLIER_TYPE_LABELS] || type;
    }, []);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteSupplier(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            showToast.success('Xóa nhà cung cấp thành công');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Xóa nhà cung cấp thất bại';
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
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setCurrentPage(pagedPage), 0);
            }
    }, [pagedPage, currentPage]);

    const handleDelete = useCallback(
        (id: number, name: string) => {
        confirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa nhà cung cấp "${name}"?`,
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
        setSearchCode('');
        setSearchName('');
        setSearchType('');
        setSearchPhone('');
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

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Nguồn hàng nhập</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý nguồn hàng nhập</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                        <FilterSection
                            error={error}
                            onRetry={handleRetry}
                            loading={loading}
                            onClearFilter={handleResetFilter}
                            onCreateNew={canCreate ? () => router.push('/categories/suppliers/create') : undefined}
                            createButtonText="Thêm mới nguồn"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                {/* Mã nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Mã nguồn
                                    </label>
                                    <input
                                        type="text"
                                        value={searchCode}
                                        onChange={(e) => setSearchCode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập mã nguồn"
                                    />
                                </div>

                                {/* Tên nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Tên nguồn
                                    </label>
                                    <input
                                        type="text"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập tên nguồn"
                                    />
                                </div>

                                {/* Loại nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Loại nguồn
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={searchType}
                                            onChange={(e) => setSearchType(e.target.value)}
                                            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                        >
                                            <option value="" className="bg-white">Tất cả</option>
                                            {Object.entries(SUPPLIER_TYPE_LABELS).map(([key, label]) => (
                                                <option key={key} value={key} className="bg-white">
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* SĐT */}
                            <div className="flex items-center gap-3">
                                <label className="block text-sm font-medium text-blue-gray-800">
                                    Số điện thoại
                                </label>
                                <input
                                    type="text"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={loading || paginationLoading}
                                    className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                                        <circle
                                            cx="7"
                                            cy="7"
                                            r="5"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M11 11L14 14"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
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
                                { key: 'name', label: 'Tên nguồn', align: 'center' },
                                { key: 'type', label: 'Loại nguồn', align: 'center' },
                                { key: 'code', label: 'Mã nguồn', align: 'center' },
                                { key: 'phone', label: 'Số điện thoại', align: 'center' },
                                { key: 'address', label: 'Địa chỉ', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={data as unknown as Record<string, unknown>[]}
                            loading={loading || paginationLoading}
                            emptyMessage="Không có dữ liệu"
                            startIndex={(pagedPage - 1) * PAGE_SIZE}
                            rowHeight={48}
                            viewportHeight={560}
                            renderRow={(item, index) => {
                                const supplier = item as unknown as Supplier;
                                const supplierName = String(supplier.name ?? '');
                                const supplierType = supplier.type ? String(supplier.type) : null;
                                const supplierId = Number(supplier.id);
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {(pagedPage - 1) * PAGE_SIZE + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {supplierName || '-'}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {getTypeLabel(supplierType)}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {String(supplier.code ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
                                            {String(supplier.phone ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
                                            {String(supplier.address ?? '-')}
                                        </td>
                                        <td className="px-4">
                                            <ActionButtons
                                                onView={() =>
                                                    router.push(`/categories/suppliers/detail/${supplierId}`)
                                                }
                                                onEdit={canEdit ? () =>
                                                    router.push(`/categories/suppliers/edit/${supplierId}`)
                                                : undefined}
                                                onDelete={canDelete ? () => handleDelete(supplierId, supplierName) : undefined}
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
        </>
    );
}
