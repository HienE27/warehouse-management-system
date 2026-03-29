'use client';

import React, { memo, useState, useMemo } from 'react';

type BaseFilters = {
  code: string;
  from: string;
  to: string;
  status: string;
  [key: string]: string;
};

type StatusOption = { value: string; label: string };

type ReportFiltersProps<T extends BaseFilters> = {
  filters: T;
  partnerKey: keyof T;
  partnerLabel: string;
  statusOptions: StatusOption[];
  loading: boolean;
  error?: string | null;
  onChange: (next: Partial<T>) => void;
  onSearch: () => void;
  onReset: () => void;
  onRetry?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showActiveCount?: boolean;
  showQuickFilters?: boolean;
};

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'date';
  icon?: React.ReactNode;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
      {icon && <span className="text-[#0099FF]">{icon}</span>}
      {label}
    </label>
    <div className="relative">
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400 transition-all duration-200 hover:border-[#0099FF]/50"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-gray-400 hover:text-blue-gray-600 transition-colors"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

const QuickFilterButton = ({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-[#0099FF] text-white shadow-md'
        : 'bg-white text-blue-gray-700 border border-blue-gray-300 hover:border-[#0099FF] hover:text-[#0099FF]'
    }`}
  >
    {label}
  </button>
);

export function ReportFilters<T extends BaseFilters>(props: ReportFiltersProps<T>) {
  const {
    filters,
    partnerKey,
    partnerLabel,
    statusOptions,
    loading,
    error,
    onChange,
    onSearch,
    onReset,
    onRetry,
    collapsible = true,
    defaultExpanded = true,
    showActiveCount = true,
    showQuickFilters = true,
  } = props;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.code) count++;
    if (filters[partnerKey]) count++;
    if (filters.from) count++;
    if (filters.to) count++;
    if (filters.status && filters.status !== 'ALL') count++;
    return count;
  }, [filters, partnerKey]);

  // Quick filter handlers
  const handleQuickFilter = (type: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (type) {
      case 'today':
        onChange({ from: formatDate(today), to: formatDate(today) } as Partial<T>);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        onChange({ from: formatDate(weekAgo), to: formatDate(today) } as Partial<T>);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        onChange({ from: formatDate(monthAgo), to: formatDate(today) } as Partial<T>);
        break;
      case 'all':
        onChange({ from: '', to: '' } as Partial<T>);
        break;
    }
  };

  const isQuickFilterActive = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const todayStr = formatDate(today);

    switch (type) {
      case 'today':
        return filters.from === todayStr && filters.to === todayStr;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return filters.from === formatDate(weekAgo) && filters.to === todayStr;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return filters.from === formatDate(monthAgo) && filters.to === todayStr;
      default:
        return false;
    }
  };

  return (
    <section className="bg-gradient-to-br from-blue-50/50 to-sky-50/30 rounded-xl border border-blue-gray-200 shadow-sm overflow-hidden">
      {/* Header with collapse button */}
      <div className="p-4 border-b border-blue-gray-200 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-blue-gray-800 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                <path
                  d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M9 8H15M9 12H15M9 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Bộ lọc
            </h3>
            {showActiveCount && activeFilterCount > 0 && (
              <span className="px-2.5 py-0.5 bg-[#0099FF] text-white text-xs font-semibold rounded-full">
                {activeFilterCount} đang active
              </span>
            )}
          </div>
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-blue-gray-600 hover:text-blue-gray-800 hover:bg-blue-gray-100 rounded-lg transition-all duration-200"
              aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Quick Filters */}
          {showQuickFilters && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-blue-gray-600 uppercase tracking-wide">Lọc nhanh</label>
              <div className="flex flex-wrap gap-2">
                <QuickFilterButton
                  label="Hôm nay"
                  onClick={() => handleQuickFilter('today')}
                  active={isQuickFilterActive('today')}
                />
                <QuickFilterButton
                  label="7 ngày qua"
                  onClick={() => handleQuickFilter('week')}
                  active={isQuickFilterActive('week')}
                />
                <QuickFilterButton
                  label="30 ngày qua"
                  onClick={() => handleQuickFilter('month')}
                  active={isQuickFilterActive('month')}
                />
                <QuickFilterButton
                  label="Tất cả"
                  onClick={() => handleQuickFilter('all')}
                  active={!filters.from && !filters.to}
                />
              </div>
            </div>
          )}

          {/* Main Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TextField
                label="Mã phiếu"
                value={filters.code}
                placeholder="Nhập mã phiếu"
                onChange={(value) => onChange({ code: value } as Partial<T>)}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  </svg>
                }
              />
              <TextField
                label={partnerLabel}
                value={filters[partnerKey] || ''}
                placeholder={`Tên ${partnerLabel.toLowerCase()}`}
                onChange={(value) => onChange({ [partnerKey]: value } as Partial<T>)}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
              />
              <TextField
                label="Từ ngày"
                value={filters.from}
                type="date"
                onChange={(value) => onChange({ from: value } as Partial<T>)}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                  </svg>
                }
              />
              <TextField
                label="Đến ngày"
                value={filters.to}
                type="date"
                onChange={(value) => onChange({ to: value } as Partial<T>)}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                  </svg>
                }
              />
      </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
                <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                    <path d="M9 12l2 2 4-4M21 12c0 4.9706-4.0294 9-9 9s-9-4.0294-9-9 4.0294-9 9-9 9 4.0294 9 9z" strokeLinecap="round" />
                  </svg>
                  Trạng thái
                </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value } as Partial<T>)}
                  className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 transition-all duration-200 hover:border-[#0099FF]/50"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
                  {onRetry && (
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
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-blue-gray-200">
            <button
              onClick={onReset}
              className="px-6 py-2.5 rounded-lg border-2 border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
              </svg>
          Đặt lại
        </button>
            <button
              onClick={onSearch}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#0099FF] hover:bg-[#0088EE] text-white font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang tải...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  Tìm kiếm
                </>
              )}
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ReportFilters) as typeof ReportFilters;

