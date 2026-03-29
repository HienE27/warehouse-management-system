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
import { deleteCategory, searchCategories, type CategoryPage } from '@/services/category.service';
import type { Category } from '@/types/category';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function CategoryManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const userRoles = user?.roles || [];
  
  const canCreate = hasPermission(userRoles, PERMISSIONS.CATEGORY_CREATE);
  const canEdit = hasPermission(userRoles, PERMISSIONS.CATEGORY_EDIT);
  const canDelete = hasPermission(userRoles, PERMISSIONS.CATEGORY_DELETE);

  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search inputs (500ms)
  const debouncedSearchCode = useDebounce(searchCode, 500);
  const debouncedSearchName = useDebounce(searchName, 500);

  // React Query for data fetching
  const {
    data: pageData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<CategoryPage, Error>({
    queryKey: ['categories', debouncedSearchCode, debouncedSearchName, currentPage],
    queryFn: async ({ signal }) => {
      const result = await searchCategories({
        code: debouncedSearchCode || undefined,
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

  const categories = useMemo(() => pageData?.content || [], [pageData?.content]);
  const totalPages = pageData?.totalPages ?? 1;
  const totalItems = pageData?.totalElements ?? 0;
  const loading = isLoading || (isFetching && currentPage === 1);
  const paginationLoading = isFetching && currentPage > 1;
  const error = queryError instanceof Error ? queryError.message : null;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast.success('Xóa danh mục thành công');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Xóa danh mục thất bại';
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
      message: 'Bạn có chắc chắn muốn xóa danh mục này?',
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
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Danh mục hàng hóa</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Quản lý danh mục hàng hóa</p>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
      <FilterSection
        error={error}
        onRetry={handleRetry}
        loading={loading}
            onClearFilter={handleResetFilter}
        onCreateNew={canCreate ? () => router.push('/categories/product-categories/create') : undefined}
        createButtonText="Thêm danh mục"
      >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
              Mã danh mục
            </label>
            <input
              type="text"
              placeholder="Nhập mã danh mục..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
                  className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
            />
          </div>
        <div>
          <label className="block text-sm font-medium text-blue-gray-800 mb-2">
              Tên danh mục
          </label>
          <input
            type="text"
              placeholder="Nhập tên danh mục..."
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
            <VirtualTable<Category>
              columns={[
                { key: 'stt', label: 'STT', align: 'left' },
                { key: 'name', label: 'Tên danh mục', align: 'left' },
                { key: 'code', label: 'Mã danh mục', align: 'left' },
                { key: 'description', label: 'Mô tả', align: 'left' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={categories}
              loading={loading || paginationLoading}
              emptyMessage="Không có danh mục nào phù hợp"
              startIndex={(pagedPage - 1) * PAGE_SIZE}
              rowHeight={48}
              viewportHeight={560}
              renderRow={(cat, index) => (
                <>
                  <td className="px-4 text-sm text-blue-gray-800">{(pagedPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 text-sm text-blue-gray-800">{cat.name}</td>
                  <td className="px-4 text-sm text-blue-gray-800">{cat.code}</td>
                  <td className="px-4 text-sm text-blue-gray-600">{cat.description || '—'}</td>
                  <td className="px-4">
                    <ActionButtons
                      onEdit={canEdit ? () => router.push(`/categories/product-categories/edit/${cat.id}`) : undefined}
                      onDelete={canDelete ? () => handleDelete(cat.id) : undefined}
                      disabled={deleteMutation.isPending}
                    />
                  </td>
                </>
              )}
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
