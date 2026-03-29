import { useState, useCallback } from 'react';

export interface UseErrorHandlingOptions {
  maxRetries?: number;
  onRetry?: () => void | Promise<void>;
}

export interface UseErrorHandlingReturn {
  error: string | null;
  setError: (error: string | null) => void;
  retryCount: number;
  handleRetry: () => void;
  canRetry: boolean;
  clearError: () => void;
}

/**
 * Custom hook để quản lý error handling với retry mechanism
 * @param options - Options cho error handling
 * @returns Error handling state và functions
 */
export function useErrorHandling(
  options: UseErrorHandlingOptions = {}
): UseErrorHandlingReturn {
  const { maxRetries = 3, onRetry } = options;
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setRetryCount((prev) => prev + 1);
    setError(null);

    if (onRetry) {
      try {
        await onRetry();
        // Reset retry count on success
        setRetryCount(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
        setError(message);
      }
    }
  }, [retryCount, maxRetries, onRetry]);

  const canRetry = retryCount < maxRetries;

  return {
    error,
    setError,
    retryCount,
    handleRetry,
    canRetry,
    clearError,
  };
}

