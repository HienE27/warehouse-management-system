'use client';

import React, { memo } from 'react';
import { formatPrice } from '@/lib/utils';

type ReportSummaryProps = {
  totalLabel: string;
  processedLabel: string;
  cancelledLabel: string;
  totalCount: number;
  totalValue: number;
  processedCount: number;
  pendingCount: number;
  cancelledCount: number;
  averageValue: number;
  onExportExcel: () => void;
  onExportPDF: () => void;
  exportLoading?: 'excel' | 'pdf' | null;
};

type StatCardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const StatCard = ({
  title,
  value,
  icon,
  valueClassName,
  variant = 'default',
  gradient = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
  variant?: StatCardVariant;
  gradient?: boolean;
}) => {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-blue-gray-200',
      iconBg: 'bg-[#0099FF]/10',
      iconColor: 'text-[#0099FF]',
      gradient: gradient ? 'bg-gradient-to-br from-blue-50 to-sky-50' : '',
    },
    primary: {
      bg: 'bg-white',
      border: 'border-[#0099FF]',
      iconBg: 'bg-gradient-to-br from-[#0099FF] to-[#0088EE]',
      iconColor: 'text-white',
      gradient: gradient ? 'bg-gradient-to-br from-[#0099FF] to-[#0088EE]' : '',
    },
    success: {
      bg: 'bg-white',
      border: 'border-green-200',
      iconBg: 'bg-gradient-to-br from-green-100 to-emerald-100',
      iconColor: 'text-green-600',
      gradient: gradient ? 'bg-gradient-to-br from-green-50 to-emerald-50' : '',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-yellow-200',
      iconBg: 'bg-gradient-to-br from-yellow-100 to-amber-100',
      iconColor: 'text-yellow-600',
      gradient: gradient ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : '',
    },
    danger: {
      bg: 'bg-white',
      border: 'border-red-200',
      iconBg: 'bg-gradient-to-br from-red-100 to-rose-100',
      iconColor: 'text-red-600',
      gradient: gradient ? 'bg-gradient-to-br from-red-50 to-rose-50' : '',
    },
  };

  const styles = variantStyles[variant];
  const isGradient = gradient && variant === 'primary';

  return (
    <div
      className={`${styles.bg} ${styles.gradient} rounded-xl shadow-md border-2 ${styles.border} p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        isGradient ? 'text-white' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isGradient ? 'text-white/90' : 'text-blue-gray-600'} truncate`}>
            {title}
          </p>
          <p
            className={`text-xl md:text-2xl font-bold ${isGradient ? 'text-white' : 'text-blue-gray-800'} mt-1 leading-tight break-all ${valueClassName || ''}`}
            style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
          >
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 flex-shrink-0 ${styles.iconBg} rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110`}>
          <div className={styles.iconColor}>{icon}</div>
        </div>
      </div>
      {variant === 'primary' && (
        <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      )}
    </div>
  );
};

const SummaryActions = ({
  cancelledLabel,
  cancelledCount,
  onExportExcel,
  onExportPDF,
  exportLoading,
}: {
  cancelledLabel: string;
  cancelledCount: number;
  onExportExcel: () => void;
  onExportPDF: () => void;
  exportLoading?: 'excel' | 'pdf' | null;
}) => (
  <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-gray-200">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      <p className="text-sm text-blue-gray-700">
        {cancelledLabel}: <span className="font-bold text-red-600 text-base">{cancelledCount}</span>
      </p>
    </div>
    <div className="flex gap-3">
      <button
        onClick={onExportExcel}
        disabled={exportLoading !== null}
        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {exportLoading === 'excel' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang xuất...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Xuất Excel
          </>
        )}
      </button>
      <button
        onClick={onExportPDF}
        disabled={exportLoading !== null}
        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {exportLoading === 'pdf' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang xuất...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
            </svg>
            Xuất PDF
          </>
        )}
      </button>
    </div>
  </section>
);

export const ReportSummary = memo((props: ReportSummaryProps) => {
  const { totalLabel, processedLabel, cancelledLabel, totalCount, totalValue, processedCount, pendingCount, cancelledCount, averageValue, onExportExcel, onExportPDF, exportLoading } =
    props;

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 max-w-full">
        <StatCard
          title={totalLabel}
          value={totalCount}
          variant="default"
          gradient={false}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5V19M5 12L12 5L19 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          title="Tổng giá trị"
          value={formatPrice(totalValue)}
          valueClassName="text-[#0099FF]"
          variant="primary"
          gradient={true}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          title={processedLabel}
          value={processedCount}
          variant="success"
          gradient={false}
          valueClassName="text-green-600"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12L10 17L19 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          title="Đang chờ xử lý"
          value={pendingCount}
          variant="warning"
          gradient={false}
          valueClassName="text-yellow-600"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8V12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16H12.01" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
            </svg>
          }
        />
        <StatCard
          title="Giá trị trung bình"
          value={formatPrice(averageValue)}
          variant="default"
          gradient={false}
          valueClassName="text-xl md:text-2xl"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12H20M4 12C4 8.13401 7.13401 5 11 5V19C7.13401 19 4 15.866 4 12Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </section>

      <SummaryActions cancelledLabel={cancelledLabel} cancelledCount={cancelledCount} onExportExcel={onExportExcel} onExportPDF={onExportPDF} exportLoading={exportLoading} />
    </>
  );
});
ReportSummary.displayName = 'ReportSummary';

export default ReportSummary;

