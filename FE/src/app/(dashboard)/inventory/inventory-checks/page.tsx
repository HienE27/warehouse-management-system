'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import ActionButtons from '@/components/common/ActionButtons';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { searchInventoryChecksPaged, deleteInventoryCheck, type InventoryCheck, type InventoryCheckStatus, type PageResponse } from '@/services/inventory.service';
import { PAGE_SIZE } from '@/constants/pagination';
import { formatPrice, formatDateTime } from '@/lib/utils';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';

const statusConfig: Record<InventoryCheckStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ nhập', color: 'bg-yellow-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
};

export default function InventoryChecksPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();
    const { confirm } = useConfirm();
    const userRoles = user?.roles || [];

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_CREATE);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterStatus, setFilterStatus] = useState<InventoryCheckStatus | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Debounce filter code
    const debouncedFilterCode = useDebounce(filterCode, 500);

    // Pagination states
    const itemsPerPage = PAGE_SIZE;

    // React Query for data fetching
    const {
        data: pageData,
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery<PageResponse<InventoryCheck>, Error>({
        queryKey: ['inventory-checks', debouncedFilterCode, filterStatus, filterFromDate, filterToDate, currentPage],
        queryFn: async ({ signal }) => {
            const result = await searchInventoryChecksPaged({
                status: filterStatus === 'ALL' ? 'ALL' : filterStatus,
                checkCode: debouncedFilterCode || undefined,
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
                page: currentPage - 1,
                size: itemsPerPage,
            });
            return result;
        },
        staleTime: 30 * 1000, // 30 seconds stale time
        gcTime: 5 * 60 * 1000, // 5 minutes cache time
        keepPreviousData: true, // Keep previous data while fetching new
    });

    const currentData = useMemo(() => pageData?.content || [], [pageData?.content]);
    const totalItems = pageData?.totalElements ?? 0;
    const totalPages = pageData?.totalPages ?? 0;
    const loading = isLoading || (isFetching && currentPage === 1);
    const paginationLoading = isFetching && currentPage > 1;
    const error = queryError instanceof Error ? queryError.message : null;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteInventoryCheck(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-checks'] });
            showToast.success('Xóa phiếu kiểm kê thành công!');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Không thể xóa phiếu kiểm kê';
            showToast.error(message);
        },
    });

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage: pagedPage, handlePageChange, paginationInfo, resetPage } = usePagination({
        itemsPerPage,
        totalItems,
        totalPages,
        onPageChange: (page) => {
            setCurrentPage(page);
        },
    });
    const startIndex = paginationInfo.startIndex;

    // Sync currentPage với pagedPage
    useEffect(() => {
        if (pagedPage !== currentPage) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setCurrentPage(pagedPage), 0);
        }
    }, [pagedPage, currentPage]);

    const handleSearchClick = useCallback(() => {
        setCurrentPage(1);
        resetPage();
        refetch();
    }, [refetch, resetPage]);

    const handleClearFilters = useCallback(() => {
        setFilterCode('');
        setFilterStatus('ALL');
        setFilterFromDate('');
        setFilterToDate('');
        setCurrentPage(1);
        resetPage();
    }, [resetPage]);

    const handleDelete = useCallback(
        (id: number, checkCode: string) => {
        confirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa phiếu kiểm kê ${checkCode}?`,
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

    const handleRetry = useCallback(() => {
        refetch();
    }, [refetch]);


    return (
        <>
            <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Kiểm kê kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Quản lý kiểm kê kho</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <FilterSection
                            error={error}
                            onRetry={handleRetry}
                            loading={loading}
                            onClearFilter={handleClearFilters}
                            onCreateNew={canCreate ? () => router.push('/inventory/create-inventory-check') : undefined}
                            createButtonText="Tạo phiếu kiểm kê"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {/* Mã phiếu */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Mã phiếu</label>
                                    <input
                                        type="text"
                                        value={filterCode}
                                        onChange={(e) => setFilterCode(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập mã phiếu"
                                    />
                                </div>

                                {/* Tình trạng */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Tình trạng</label>
                                    <div className="relative">
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value as InventoryCheckStatus | 'ALL')}
                                            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                        >
                                            <option value="ALL" className="bg-white">Tất cả</option>
                                            <option value="PENDING" className="bg-white">Chờ duyệt</option>
                                            <option value="APPROVED" className="bg-white">Đã duyệt</option>
                                            <option value="REJECTED" className="bg-white">Từ chối</option>
                                        </select>
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Từ ngày */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={filterFromDate}
                                        onChange={(e) => setFilterFromDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                </div>

                                {/* Đến ngày */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={filterToDate}
                                        onChange={(e) => setFilterToDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handleSearchClick}
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

                    {/* Table */}
                    <div className="px-6 pb-6">
                        <VirtualTable
                            columns={[
                                { key: 'stt', label: 'STT', align: 'center' },
                                { key: 'code', label: 'Mã phiếu', align: 'center' },
                                { key: 'description', label: 'Mô tả', align: 'center' },
                                { key: 'difference', label: 'Chênh lệch', align: 'center' },
                                { key: 'date', label: 'Ngày kiểm kê', align: 'center' },
                                { key: 'status', label: 'Tình trạng', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={currentData as unknown as Record<string, unknown>[]}
                            loading={loading || paginationLoading}
                            emptyMessage="Không có phiếu kiểm kê nào"
                            startIndex={startIndex}
                            rowHeight={48}
                            viewportHeight={560}
                            renderRow={(record, index) => {
                                const check = record as unknown as InventoryCheck;
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">{check.checkCode}</td>
                                        <td className="px-4 text-center text-sm truncate text-blue-gray-400" title={check.description || ''}>
                                            {check.description || '-'}
                                        </td>
                                        <td className={`px-4 text-center text-sm font-medium ${check.totalDifferenceValue > 0 ? 'text-green-400' : check.totalDifferenceValue < 0 ? 'text-red-400' : 'text-blue-gray-400'}`}>
                                            {formatPrice(check.totalDifferenceValue)}
                                        </td>
                                        <td className="px-4 text-center text-sm whitespace-nowrap">
                                            {formatDateTime(check.checkDate)}
                                        </td>
                                        <td className="px-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium text-black whitespace-nowrap ${statusConfig[check.status].color}`}>
                                                {statusConfig[check.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4">
                                            <ActionButtons
                                                onView={() => router.push(`/inventory/view-inventory-check/${check.id}`)}
                                                onEdit={() => router.push(`/inventory/edit-inventory-check/${check.id}`)}
                                                onDelete={() => handleDelete(check.id, check.checkCode)}
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
                                itemsPerPage={itemsPerPage}
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
