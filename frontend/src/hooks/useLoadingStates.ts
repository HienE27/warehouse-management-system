import { useState, useCallback, useMemo } from 'react';

export interface UseLoadingStatesReturn {
  loading: boolean;
  searchLoading: boolean;
  paginationLoading: boolean;
  exportLoading: 'excel' | 'pdf' | null;
  setLoading: (loading: boolean) => void;
  setSearchLoading: (loading: boolean) => void;
  setPaginationLoading: (loading: boolean) => void;
  setExportLoading: (loading: 'excel' | 'pdf' | null) => void;
  isAnyLoading: boolean;
}

/**
 * Custom hook để quản lý các loading states khác nhau
 * @returns Loading states và setters
 */
export function useLoadingStates(): UseLoadingStatesReturn {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  const isAnyLoading = useMemo(
    () => loading || searchLoading || paginationLoading || exportLoading !== null,
    [loading, searchLoading, paginationLoading, exportLoading]
  );

  return {
    loading,
    searchLoading,
    paginationLoading,
    exportLoading,
    setLoading: useCallback((value: boolean) => setLoading(value), []),
    setSearchLoading: useCallback((value: boolean) => setSearchLoading(value), []),
    setPaginationLoading: useCallback((value: boolean) => setPaginationLoading(value), []),
    setExportLoading: useCallback((value: 'excel' | 'pdf' | null) => setExportLoading(value), []),
    isAnyLoading,
  };
}

