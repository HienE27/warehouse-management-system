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
import { deleteUnit, searchUnits, type UnitPage } from '@/services/unit.service';
import type { Unit } from '@/types/unit';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function UnitManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const userRoles = user?.roles || [];
  
  const canCreate = hasPermission(userRoles, PERMISSIONS.UNIT_CREATE);
  const canEdit = hasPermission(userRoles, PERMISSIONS.UNIT_EDIT);
  const canDelete = hasPermission(userRoles, PERMISSIONS.UNIT_DELETE);

  const [searchName, setSearchName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input (500ms)
  const debouncedSearchName = useDebounce(searchName, 500);

  // React Query for data fetching
  const {
    data: pageData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<UnitPage, Error>({
    queryKey: ['units', debouncedSearchName, currentPage],
    queryFn: async ({ signal }) => {
      const result = await searchUnits({
        name: debouncedSearchName || undefined,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds stale time
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    placeholderData: (previousData) => previousData ?? undefined, // Giữ data cũ trong khi fetch trang mới
  });

  const units = useMemo(() => pageData?.content || [], [pageData?.content]);
  const totalPages = pageData?.totalPages ?? 1;
  const totalItems = pageData?.totalElements ?? 0;
  const loading = isLoading || (isFetching && currentPage === 1);
  const paginationLoading = isFetching && currentPage > 1;
  const error = queryError instanceof Error ? queryError.message : null;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUnit(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['units'] });
      showToast.success('Xóa đơn vị thành công');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Xóa đơn vị thất bại';
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
    (id: number) => {
    confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa đơn vị này?',
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
    setSearchName('');
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
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Đơn vị tính</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Quản lý đơn vị tính</p>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          <FilterSection
        error={error}
        onRetry={handleRetry}
        loading={loading}
        onClearFilter={handleResetFilter}
        onCreateNew={canCreate ? () => router.push('/categories/units/create') : undefined}
        createButtonText="Thêm đơn vị"
      >
        <div>
          <label className="block text-sm font-medium text-blue-gray-800 mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
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
                { key: 'stt', label: 'STT', align: 'left' },
                { key: 'name', label: 'Tên đơn vị', align: 'left' },
                { key: 'description', label: 'Mô tả', align: 'left' },
                { key: 'status', label: 'Trạng thái', align: 'left' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={units as unknown as Record<string, unknown>[]}
              loading={loading || paginationLoading}
              emptyMessage="Không có đơn vị nào phù hợp"
              startIndex={(pagedPage - 1) * PAGE_SIZE}
              rowHeight={48}
              viewportHeight={560}
              renderRow={(unit, index) => {
                const unitItem = unit as unknown as Unit;
                return (
                <>
                    <td className="px-4 text-sm text-blue-gray-800">{(pagedPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 text-sm text-blue-gray-800">{String(unitItem.name)}</td>
                    <td className="px-4 text-sm text-blue-gray-600">{String(unitItem.description || '—')}</td>
                  <td className="px-4 text-sm">
                    <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${unitItem.active === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        }`}
                    >
                        {unitItem.active === false ? 'Không hoạt động' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-4">
                    <ActionButtons
                        onEdit={canEdit ? () => router.push(`/categories/units/edit/${Number(unitItem.id)}`) : undefined}
                        onDelete={canDelete ? () => handleDelete(Number(unitItem.id)) : undefined}
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
    </>
  );
}
