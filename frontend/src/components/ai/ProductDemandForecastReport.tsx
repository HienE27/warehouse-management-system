'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/services/product.service';
import { getProductDemandForecast, type ProductDemandForecastResponse } from '@/services/ai.service';
import type { Product } from '@/types/product';

export default function ProductDemandForecastReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [forecast, setForecast] = useState<ProductDemandForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Không tự động load forecast khi chọn sản phẩm, chỉ load khi user nhấn nút

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const productList = await getProducts();
      setProducts(productList);
      if (productList.length > 0 && !selectedProductId) {
        setSelectedProductId(productList[0].id);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadForecast = async () => {
    if (!selectedProductId) return;
    try {
      setLoading(true);
      const data = await getProductDemandForecast(selectedProductId, forecastDays);
      setForecast(data);
    } catch (err) {
      console.error('Error loading forecast:', err);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (days: number | null) => {
    if (days === null) return 'text-gray-600';
    if (days === 0) return 'text-red-600 font-bold';
    if (days <= 7) return 'text-red-600';
    if (days <= 14) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (days: number | null) => {
    if (days === null) return { text: 'Không có dữ liệu', color: 'bg-gray-100 text-gray-700' };
    if (days === 0) return { text: '🔴 Đã hết hàng', color: 'bg-red-100 text-red-700' };
    if (days <= 7) return { text: '⚠️ Khẩn cấp', color: 'bg-red-100 text-red-700' };
    if (days <= 14) return { text: '⚠️ Cần chú ý', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '✅ An toàn', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Chọn sản phẩm để phân tích</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sản phẩm
            </label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={loadingProducts}
            >
              {loadingProducts ? (
                <option>Đang tải...</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số ngày dự đoán
            </label>
            <select
              value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={60}>60 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forecast Report */}
      {!forecast && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <button
            onClick={loadForecast}
            disabled={!selectedProductId || loading}
            className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {!selectedProductId ? 'Vui lòng chọn sản phẩm' : '📊 Phân tích và tạo báo cáo'}
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang phân tích và tạo báo cáo...</p>
        </div>
      ) : forecast ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{forecast.productName}</h2>
                <p className="text-gray-600">Mã: {forecast.productCode}</p>
              </div>
              <div className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-lg ${getStatusBadge(forecast.predictedDaysUntilStockOut).color}`}>
                <p className="font-semibold">{getStatusBadge(forecast.predictedDaysUntilStockOut).text}</p>
                </div>
                <button
                  onClick={loadForecast}
                  disabled={loading}
                  className="px-4 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  🔄 Làm mới
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Tồn kho hiện tại</p>
                <p className="text-2xl font-bold text-gray-800">{forecast.currentStock.toLocaleString('vi-VN')}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Tốc độ bán/ngày</p>
                <p className="text-2xl font-bold text-blue-600">{forecast.avgDailySales.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Dự đoán hết hàng</p>
                <p className={`text-2xl font-bold ${getStatusColor(forecast.predictedDaysUntilStockOut)}`}>
                  {forecast.predictedDaysUntilStockOut !== null
                    ? `${forecast.predictedDaysUntilStockOut} ngày`
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Độ tin cậy</p>
                <p className="text-2xl font-bold text-purple-600">{(forecast.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {forecast.recommendations && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-800 mb-4">💡 Đề xuất hành động</h3>
              <div className="text-base text-yellow-900 whitespace-pre-line leading-relaxed font-medium">
                {forecast.recommendations.split('\n').map((line, idx) => (
                  <p key={idx} className="mb-2">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          {forecast.detailedAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-800 mb-4">📊 Phân tích chi tiết</h3>
              <p className="text-base text-blue-900 whitespace-pre-line leading-relaxed font-medium">
                {forecast.detailedAnalysis}
              </p>
            </div>
          )}

          {/* Recommendations for Reorder */}
          {(forecast.recommendedReorderQuantity || forecast.optimalStockLevel) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-green-800 mb-3">📦 Khuyến nghị nhập hàng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forecast.recommendedReorderQuantity && (
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Số lượng nhập đề xuất</p>
                    <p className="text-2xl font-bold text-green-600">
                      {forecast.recommendedReorderQuantity.toLocaleString('vi-VN')} sản phẩm
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Đủ cho 14 ngày</p>
                  </div>
                )}
                {forecast.optimalStockLevel && (
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Mức tồn tối ưu</p>
                    <p className="text-2xl font-bold text-green-600">
                      {forecast.optimalStockLevel.toLocaleString('vi-VN')} sản phẩm
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Đủ cho 21 ngày</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Forecast Table */}
          {forecast.dailyForecasts && forecast.dailyForecasts.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">📅 Dự đoán theo từng ngày</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">Ngày</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">Tồn kho dự đoán</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">Bán dự đoán</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {forecast.dailyForecasts.map((daily, index) => (
                      <tr
                        key={index}
                        className={`${daily.predictedStock === 0 ? 'bg-red-50 hover:bg-red-100' : daily.predictedStock <= 10 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {formatDate(daily.date)} <span className="text-gray-500">(Ngày {daily.day})</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {daily.predictedStock.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {daily.predictedSales.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {daily.predictedStock === 0 ? (
                            <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold">
                              🔴 Hết hàng
                            </span>
                          ) : daily.predictedStock <= 10 ? (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-md text-xs font-semibold">
                              ⚠️ Sắp hết
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                              ✅ Đủ hàng
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : forecast && forecast.avgDailySales > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-600 text-center">Không có dữ liệu dự đoán theo ngày. Vui lòng thử lại sau.</p>
            </div>
          ) : null}
        </div>
      ) : selectedProductId ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-600">Không thể tải báo cáo dự báo. Vui lòng thử lại.</p>
        </div>
      ) : null}
    </div>
  );
}
