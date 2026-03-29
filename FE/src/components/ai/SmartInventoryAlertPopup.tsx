'use client';

import { useState, useEffect } from 'react';
import { getSmartInventoryAlerts, type InventoryAlert } from '@/services/ai.service';

interface SmartInventoryAlertPopupProps {
  onClose: () => void;
}

export default function SmartInventoryAlertPopup({ onClose }: SmartInventoryAlertPopupProps) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const STORAGE_KEY = 'smartInventoryAlertsCache';

  // Load cache từ sessionStorage khi mở popup, KHÔNG gọi API
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { alerts?: InventoryAlert[]; summary?: string; lastUpdated?: string };
      setAlerts(parsed.alerts || []);
      setSummary(parsed.summary || '');
      setHasLoaded(true);
    } catch (err) {
      // Dùng console.warn để tránh Next.js dev overlay
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SmartInventoryAlertPopup] Failed to load cache:', err);
      }
    }
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await getSmartInventoryAlerts();
      setAlerts(response.alerts || []);
      setSummary(response.summary || '');

      // Lưu cache cho lần sau
      try {
        if (typeof window !== 'undefined') {
          const cache = {
            alerts: response.alerts || [],
            summary: response.summary || '',
            lastUpdated: new Date().toISOString(),
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        }
      } catch (err) {
        // Dùng console.warn để tránh Next.js dev overlay
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SmartInventoryAlertPopup] Failed to save cache:', err);
        }
      }
    } catch (err) {
      // Dùng console.warn để tránh Next.js dev overlay
      const message = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error loading smart inventory alerts:', message);
      }
      setAlerts([]);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-300 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      case 'INFO':
        return 'bg-blue-50 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '⚠️';
      case 'OUT_OF_STOCK':
        return '🔴';
      case 'SLOW_SELLING':
        return '🐌';
      case 'FAST_SELLING':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'Sắp hết hàng';
      case 'OUT_OF_STOCK':
        return 'Hết hàng';
      case 'SLOW_SELLING':
        return 'Bán chậm';
      case 'FAST_SELLING':
        return 'Bán nhanh';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🔔 Cảnh báo tồn kho thông minh</h2>
            <p className="text-purple-100 mt-1">{summary}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang phân tích tồn kho...</p>
            </div>
          ) : !hasLoaded ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-700 font-semibold mb-2">
                Nhấn nút &quot;Làm mới&quot; để tải cảnh báo tồn kho thông minh.
              </p>
              <p className="text-sm text-gray-500">
                Hệ thống sẽ phân tích dữ liệu tồn kho và hiển thị các cảnh báo quan trọng tại đây.
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl text-gray-600">Không có cảnh báo nào</p>
              <p className="text-gray-500 mt-2">Tồn kho đang được quản lý tốt</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{getTypeIcon(alert.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">{getTypeLabel(alert.type)}</span>
                        <span className="text-sm px-2 py-1 bg-white/50 rounded">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="font-semibold mb-1">{alert.productName} ({alert.productCode})</p>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="font-medium">Tồn kho hiện tại: </span>
                          <span>{alert.currentStock.toLocaleString('vi-VN')}</span>
                        </div>
                        {alert.predictedDaysRemaining != null && (
                          <div>
                            <span className="font-medium">Còn lại: </span>
                            <span>{alert.predictedDaysRemaining} ngày</span>
                          </div>
                        )}
                        {alert.avgDailySales != null && (
                          <div>
                            <span className="font-medium">Tốc độ bán: </span>
                            <span>{alert.avgDailySales.toFixed(1)}/ngày</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-white/50 rounded p-2 mt-2">
                        <p className="text-sm">
                          <span className="font-medium">💡 Đề xuất: </span>
                          {alert.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
