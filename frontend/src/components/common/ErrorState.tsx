'use client';

import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  icon?: ReactNode;
  retryCount?: number;
  maxRetries?: number;
  loading?: boolean;
  compact?: boolean;
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message,
  error,
  onRetry,
  icon,
  retryCount = 0,
  maxRetries = 3,
  loading = false,
  compact = false,
}: ErrorStateProps) {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : typeof error === 'string' ? error : 'Vui lòng thử lại sau.');

  const defaultIcon = (
    <svg
      className="w-16 h-16 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );

  if (compact) {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-2">{errorMessage}</p>
            {onRetry && retryCount < maxRetries && (
              <button
                onClick={onRetry}
                disabled={loading}
                className="text-xs font-medium text-red-700 hover:text-red-900 underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 21V15M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 3v6M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {loading ? 'Đang thử lại...' : 'Thử lại'}
              </button>
            )}
            {retryCount >= maxRetries && (
              <p className="text-xs text-red-600 mt-1">Đã thử lại {retryCount} lần. Vui lòng kiểm tra kết nối mạng hoặc liên hệ hỗ trợ.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">{icon || defaultIcon}</div>
      <h3 className="text-lg font-semibold text-red-600 mb-2">{title}</h3>
      <p className="text-sm text-blue-gray-600 mb-6 max-w-md">{errorMessage}</p>
      {onRetry && retryCount < maxRetries && (
        <button
          onClick={onRetry}
          disabled={loading}
          className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang thử lại...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Thử lại
            </>
          )}
        </button>
      )}
      {retryCount >= maxRetries && (
        <p className="text-xs text-red-600 mt-2">Đã thử lại {retryCount} lần. Vui lòng kiểm tra kết nối mạng hoặc liên hệ hỗ trợ.</p>
      )}
    </div>
  );
}

