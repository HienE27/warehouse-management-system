import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePagination } from './usePagination';
import { PAGE_SIZE } from '@/constants/pagination';

export interface UseDataFetchingOptions<TData, TError = Error> {
  queryKey: (string | number | boolean | undefined)[];
  queryFn: (context: { signal?: AbortSignal }) => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  keepPreviousData?: boolean;
  onError?: (error: TError) => void;
  onSuccess?: (data: TData) => void;
  itemsPerPage?: number;
}

export interface UseDataFetchingReturn<TData extends { content?: unknown[]; totalElements?: number; totalPages?: number }> {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: TError | null;
  refetch: () => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
  resetPage: () => void;
  // Loading states
  loading: boolean;
  paginationLoading: boolean;
  // Data
  currentData: TData extends { content: infer T } ? T[] : unknown[];
}

/**
 * Custom hook để standardize data fetching pattern với React Query và pagination
 * @param options - Options cho data fetching
 * @returns Data fetching state và functions
 */
export function useDataFetching<TData extends { content?: unknown[]; totalElements?: number; totalPages?: number }, TError = Error>(
  options: UseDataFetchingOptions<TData, TError>
): UseDataFetchingReturn<TData> {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = 30 * 1000,
    gcTime = 5 * 60 * 1000,
    keepPreviousData = true,
    onError,
    onSuccess,
    itemsPerPage = PAGE_SIZE,
  } = options;

  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<TData, TError>({
    queryKey: [...queryKey, currentPage],
    queryFn: queryFn,
    enabled,
    staleTime,
    gcTime,
    keepPreviousData,
    onError,
    onSuccess,
  } as UseQueryOptions<TData, TError>);

  const totalPages = useMemo(() => (data as { totalPages?: number })?.totalPages ?? 1, [data]);
  const totalItems = useMemo(() => (data as { totalElements?: number })?.totalElements ?? 0, [data]);
  const currentData = useMemo(() => ((data as { content?: unknown[] })?.content ?? []) as TData extends { content: infer T } ? T[] : unknown[], [data]);

  const loading = isLoading || (isFetching && currentPage === 1);
  const paginationLoading = isFetching && currentPage > 1;
  const error = queryError || null;

  const { currentPage: pagedPage, handlePageChange, resetPage } = usePagination({
    itemsPerPage,
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

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
    currentPage: pagedPage,
    totalPages,
    totalItems,
    handlePageChange,
    resetPage,
    loading,
    paginationLoading,
    currentData,
  };
}

