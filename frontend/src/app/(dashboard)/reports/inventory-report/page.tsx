'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { ensureVnFont } from '@/lib/pdf';
import { showToast } from '@/lib/toast';
import { getProducts } from '@/services/product.service';
import { getOrders } from '@/services/order.service';
import { aiInventoryForecast } from '@/services/ai.service';
import { useAllStocks } from '@/hooks/useAllStocks';
import type { Product } from '@/types/product';
import type { Order } from '@/types/order';

import { formatPrice } from '@/lib/utils';

// Format AI suggestion text with better layout
const formatAISuggestion = (text: string) => {
    if (!text) return null;

    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    
    return (
        <div className="space-y-5">
            {paragraphs.map((para, idx) => {
                const trimmed = para.trim();
                const lines = trimmed.split('\n').filter(l => l.trim());
                
                // Check for important notes section (contains "LƯU Ý", "QUAN TRỌNG", etc.)
                if (/LƯU Ý|QUAN TRỌNG|CẢNH BÁO|CHÚ Ý/i.test(trimmed)) {
                    const noteLines = lines.map(l => l.trim()).filter(l => l);
                    return (
                        <div key={idx} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-600">
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    {noteLines.map((line, lineIdx) => {
                                        if (lineIdx === 0 && /LƯU Ý|QUAN TRỌNG|CẢNH BÁO|CHÚ Ý/i.test(line)) {
                                            return (
                                                <h6 key={lineIdx} className="text-sm font-bold text-amber-900 mb-2">
                                                    {line}
                                                </h6>
                                            );
                                        }
                                        return (
                                            <p key={lineIdx} className="text-sm text-amber-800 leading-relaxed">
                                                {line}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                }
                
                // Check for headers (all caps, possibly with special chars, single line)
                if (lines.length === 1 && /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s\-\:]+$/.test(trimmed) && trimmed.length < 100) {
                    return (
                        <div key={idx} className="pt-1 first:pt-0">
                            <h5 className="text-base font-bold text-[#0099FF] mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-gradient-to-b from-[#0099FF] to-[#0088EE] rounded-full"></span>
                                {trimmed}
                            </h5>
                        </div>
                    );
                }
                
                // Check for bullet points or numbered lists
                const firstLine = lines[0] || '';
                if (/^[\-\•\*]\s/.test(firstLine) || /^\d+[\.\)]\s/.test(firstLine)) {
                    const listItems = lines.filter(l => /^[\-\•\*]\s|^\d+[\.\)]\s/.test(l.trim()));
                    if (listItems.length > 0) {
                        return (
                            <div key={idx} className="space-y-1">
                                {listItems.map((item, itemIdx) => {
                                    const cleanItem = item.replace(/^[\-\•\*]\s|^\d+[\.\)]\s/, '').trim();
                                    return (
                                        <div key={itemIdx} className="flex items-start gap-3 pl-1">
                                            <span className="text-[#0099FF] mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#0099FF]"></span>
                                            <span className="text-sm leading-relaxed text-blue-gray-700 flex-1">{cleanItem}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                }
                
                // Regular paragraph with better formatting
                return (
                    <div key={idx} className="space-y-2">
                        {lines.map((line, lineIdx) => {
                            // Check if line is a sub-header (starts with capital and ends with colon)
                            if (/^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ].*:$/.test(line.trim()) && line.length < 80) {
                                return (
                                    <h6 key={lineIdx} className="text-sm font-semibold text-blue-gray-800 mt-3 first:mt-0">
                                        {line}
                                    </h6>
                                );
                            }
                            return (
                                <p key={lineIdx} className="text-sm leading-relaxed text-blue-gray-700">
                                    {line}
                                </p>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

type ProductWithStock = Product & { quantity: number };

export default function InventoryReportPage() {
    const [data, setData] = useState<ProductWithStock[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isDataLoadError, setIsDataLoadError] = useState(false); // Flag để phân biệt lỗi loadData vs lỗi khác
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<InventoryForecastResult | null>(null);
    const [aiExpanded, setAiExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [aiErrorShown, setAiErrorShown] = useState(false);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterMinQuantity, setFilterMinQuantity] = useState('');
    const [filterMaxQuantity, setFilterMaxQuantity] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

    // Debounced filter values
    const debouncedFilterCode = useDebounce(filterCode, 400);
    const debouncedFilterName = useDebounce(filterName, 400);

    const AI_SUGGESTION_STORAGE_KEY = 'inventoryReport_aiSuggestion_v2';
    const AI_SUGGESTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

    const getAiCacheKey = useCallback(() => {
        // Cache key depends on filters + stock status (enough to separate typical user intents)
        return [
            AI_SUGGESTION_STORAGE_KEY,
            debouncedFilterCode || '',
            debouncedFilterName || '',
            filterMinQuantity || '',
            filterMaxQuantity || '',
            filterStockStatus || 'ALL',
        ].join('|');
    }, [debouncedFilterCode, debouncedFilterName, filterMinQuantity, filterMaxQuantity, filterStockStatus]);

    // Load gợi ý AI đã lưu trong sessionStorage (nếu có và còn hạn), không gọi AI tự động
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = sessionStorage.getItem(getAiCacheKey());
            if (raw) {
                const parsed = JSON.parse(raw) as { ts: number; sig: string; data: InventoryForecastResult };
                if (parsed?.data && typeof parsed.ts === 'number') {
                    const age = Date.now() - parsed.ts;
                    if (age <= AI_SUGGESTION_TTL_MS) {
                        setAiSuggestion(parsed.data);
                    }
                }
            }
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Failed to load cached AI suggestion:', err);
            }
        }
        // Clear error state khi component mount để tránh hiển thị lỗi cũ
        setError(null);
        setIsDataLoadError(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load stocks với React Query cache
    const { data: stockList = [], isLoading: stocksLoading } = useAllStocks();

    // Sort states
    const [sortName, setSortName] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortQuantity, setSortQuantity] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortValue, setSortValue] = useState<'none' | 'asc' | 'desc'>('none');

    // Pagination states
    const itemsPerPage = PAGE_SIZE;

    // handlePageChange đã được cung cấp bởi usePagination hook với scroll preservation

    // Process stockList để tạo stockMap - tách ra để tối ưu
    const processStockList = useCallback((stocks: typeof stockList) => {
        const stockMap = new Map<number, number>();
        if (stocks && stocks.length > 0) {
            stocks.forEach((stock) => {
                const current = stockMap.get(stock.productId) || 0;
                stockMap.set(stock.productId, current + stock.quantity);
            });
        }
        return stockMap;
    }, []);

    // Load products data - tối ưu: tách stockList processing
    const loadData = useCallback(async (retry = false) => {
        try {
            setLoading(true);
            if (retry) {
            setError(null);
                setRetryCount(prev => prev + 1);
            }

            // Lấy sản phẩm (stocks đã được load qua useAllStocks hook)
            const products = await getProducts();

            // Tổng hợp tồn kho theo productId (từ tất cả các kho)
            const stockMap = processStockList(stockList);

            // Cập nhật quantity cho từng sản phẩm từ tồn kho thực tế
            const productsWithStock: ProductWithStock[] = products.map(product => ({
                ...product,
                quantity: stockMap.get(product.id) || 0
            }));

            setData(productsWithStock);
            setError(null);
            setIsDataLoadError(false);
            setRetryCount(0);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Lỗi tải dữ liệu';
            setError(errorMessage);
            setIsDataLoadError(true); // Đánh dấu đây là lỗi loadData
            // Dùng console.warn để tránh Next.js dev overlay
            if (process.env.NODE_ENV === 'development') {
                console.warn('❌ Error loading products:', err instanceof Error ? err.message : String(err));
            }
        } finally {
            setLoading(false);
        }
    }, [stockList, processStockList]);

    // Optimized sorting function - single sort với comparator
    const applySorting = useCallback((data: ProductWithStock[]) => {
        // Nếu không có sort nào, return data gốc
        if (sortName === 'none' && sortQuantity === 'none' && sortValue === 'none') {
            return data;
        }

        // Single sort với multi-level comparator
        return [...data].sort((a, b) => {
            // Sort by name first (nếu có)
        if (sortName !== 'none') {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const nameResult = nameA.localeCompare(nameB, 'vi');
                if (nameResult !== 0) {
                    return sortName === 'asc' ? nameResult : -nameResult;
                }
        }

            // Then by quantity (nếu có)
        if (sortQuantity !== 'none') {
                const qtyA = a.quantity || 0;
                const qtyB = b.quantity || 0;
                const qtyResult = qtyA - qtyB;
                if (qtyResult !== 0) {
                    return sortQuantity === 'asc' ? qtyResult : -qtyResult;
                }
        }

            // Finally by value (nếu có)
        if (sortValue !== 'none') {
                const valueA = (a.quantity || 0) * (a.unitPrice || 0);
                const valueB = (b.quantity || 0) * (b.unitPrice || 0);
                const valueResult = valueA - valueB;
                if (valueResult !== 0) {
                    return sortValue === 'asc' ? valueResult : -valueResult;
                }
            }

            return 0;
        });
    }, [sortName, sortQuantity, sortValue]);

    // Optimized filtering and sorting logic - combine filters trong single pass
    const filteredData = useMemo(() => {
        if (!data.length) return [];

        // Pre-compute filter values để tránh tính toán lại
        const codeLower = debouncedFilterCode ? debouncedFilterCode.toLowerCase() : null;
        const nameLower = debouncedFilterName ? debouncedFilterName.toLowerCase() : null;
        const minQty = filterMinQuantity ? Number(filterMinQuantity) : null;
        const maxQty = filterMaxQuantity ? Number(filterMaxQuantity) : null;
        const hasMinQty = minQty !== null && !isNaN(minQty);
        const hasMaxQty = maxQty !== null && !isNaN(maxQty);

        // Single pass filtering - combine tất cả filters
        const filtered = data.filter(item => {
            // Filter by code
            if (codeLower && !item.code.toLowerCase().includes(codeLower)) {
                return false;
            }

            // Filter by name
            if (nameLower && !item.name.toLowerCase().includes(nameLower)) {
                return false;
        }

            // Filter by quantity range
            const qty = item.quantity || 0;
            if (hasMinQty && qty < minQty!) {
                return false;
            }
            if (hasMaxQty && qty > maxQty!) {
                return false;
            }

            // Filter by stock status
            if (filterStockStatus !== 'ALL') {
                if (filterStockStatus === 'OUT_OF_STOCK' && qty !== 0) return false;
                if (filterStockStatus === 'LOW_STOCK' && (qty === 0 || qty > 10)) return false;
                if (filterStockStatus === 'IN_STOCK' && qty <= 10) return false;
            }

            return true;
        });

        // Apply sorting
        return applySorting(filtered);
    }, [data, debouncedFilterCode, debouncedFilterName, filterMinQuantity, filterMaxQuantity, filterStockStatus, applySorting]);

    const handleSortName = () => {
        const newSort = sortName === 'none' ? 'asc' : sortName === 'asc' ? 'desc' : 'none';
        setSortName(newSort);
        setSortQuantity('none');
        setSortValue('none');
    };

    const handleSortQuantity = () => {
        const newSort = sortQuantity === 'none' ? 'asc' : sortQuantity === 'asc' ? 'desc' : 'none';
        setSortQuantity(newSort);
        setSortName('none');
        setSortValue('none');
    };

    const handleSortValue = () => {
        const newSort = sortValue === 'none' ? 'asc' : sortValue === 'asc' ? 'desc' : 'none';
        setSortValue(newSort);
        setSortName('none');
        setSortQuantity('none');
    };

    // Load data khi stockList đã sẵn sàng - tối ưu dependencies
    const stockListLength = stockList.length;
    useEffect(() => {
        if (!stocksLoading && stockListLength > 0) {
            loadData(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stocksLoading, stockListLength]); // Chỉ phụ thuộc vào loading state và length, không phụ thuộc vào toàn bộ array

    // Trigger search when debounced filters change
    useEffect(() => {
        if (data.length > 0) {
            setSearchLoading(true);
            const timer = setTimeout(() => {
                setSearchLoading(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [debouncedFilterCode, debouncedFilterName, filterMinQuantity, filterMaxQuantity, filterStockStatus, data.length]);

    const handleSearch = useCallback(() => {
        setSearchLoading(true);
        // Search is handled by debounced filters, just show loading briefly
        setTimeout(() => {
            setSearchLoading(false);
        }, 200);
    }, []);

    const handleRetry = useCallback(() => {
        loadData(true);
    }, [loadData]);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        setFilterMinQuantity('');
        setFilterMaxQuantity('');
        setFilterStockStatus('ALL');
        setSortName('none');
        setSortQuantity('none');
        setSortValue('none');
        // Clear error state khi reset
        setError(null);
        setIsDataLoadError(false);
    };

    // Calculate active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filterCode) count++;
        if (filterName) count++;
        if (filterMinQuantity) count++;
        if (filterMaxQuantity) count++;
        if (filterStockStatus !== 'ALL') count++;
        return count;
    }, [filterCode, filterName, filterMinQuantity, filterMaxQuantity, filterStockStatus]);

    const getStockStatusLabel = (quantity: number) => {
        if (quantity === 0) return 'Hết hàng';
        if (quantity <= 10) return 'Sắp hết';
        return 'Còn hàng';
    };

    // Memoized export rows để tránh tính toán lại
    const buildExportRows = useMemo(() => {
        return filteredData.map((item, index) => {
            const quantity = item.quantity || 0;
            const unitPrice = item.unitPrice || 0;
            const value = quantity * unitPrice;
            return {
                STT: index + 1,
                'Mã hàng': item.code,
                'Tên hàng hóa': item.name,
                'Số lượng': quantity,
                'Đơn giá': unitPrice,
                'Giá trị tồn': value,
                'Tình trạng': getStockStatusLabel(quantity),
            };
        });
    }, [filteredData]);

    const handleExportExcel = async () => {
        try {
            if (!filteredData.length) {
                showToast.error('Không có dữ liệu để xuất.');
                return;
            }
            setExportLoading('excel');
            const XLSX = await import('xlsx');
            const worksheet = XLSX.utils.json_to_sheet(buildExportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_ton_kho');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-ton-kho-${date}.xlsx`);
            showToast.success('Xuất Excel thành công!');
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
            console.error('Export Excel failed', err);
            }
            showToast.error('Xuất Excel thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    };

    const handleExportPDF = async () => {
        try {
            if (!filteredData.length) {
                showToast.error('Không có dữ liệu để xuất.');
                return;
            }
            setExportLoading('pdf');
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape' });

            await ensureVnFont(doc);

            doc.setFontSize(16);
            doc.text('Báo cáo tồn kho', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng mặt hàng: ${totalProducts}`, 14, 32);
            doc.text(`Tổng giá trị: ${formatPrice(totalValue)} đ`, 80, 32);

            const rows = buildExportRows.map(row => [
                row.STT,
                row['Mã hàng'],
                row['Tên hàng hóa'],
                formatPrice(row['Số lượng']),
                formatPrice(row['Đơn giá']),
                formatPrice(row['Giá trị tồn']),
                row['Tình trạng'],
            ]);

            autoTable(doc, {
                head: [['STT', 'Mã hàng', 'Tên hàng hóa', 'Số lượng', 'Đơn giá', 'Giá trị tồn', 'Tình trạng']],
                body: rows,
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 70, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-ton-kho-${date}.pdf`);
            showToast.success('Xuất PDF thành công!');
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
            console.error('Export PDF failed', err);
            }
            showToast.error('Xuất PDF thất bại, vui lòng thử lại.');
        } finally {
            setExportLoading(null);
        }
    };

    // Calculate statistics
    const totalProducts = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = filteredData.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const outOfStockCount = filteredData.filter(item => (item.quantity || 0) === 0).length;
    const lowStockCount = filteredData.filter(item => {
        const qty = item.quantity || 0;
        return qty > 0 && qty <= 10;
    }).length;

    // Pagination - sử dụng hook để tối ưu
    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        handlePageChange,
        resetPage,
    } = usePagination(filteredData, itemsPerPage);
    const { startIndex } = paginationInfo;


    const getStockStatusBadge = (quantity: number) => {
        if (quantity === 0) {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Hết hàng</span>;
        } else if (quantity <= 10) {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Sắp hết</span>;
        } else {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Còn hàng</span>;
        }
    };

    const handleRefreshData = useCallback(() => {
        loadData(false);
    }, [loadData]);

    const handleRefreshAI = useCallback(() => {
        // Clear AI cache và suggestion (only current filter's cache)
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(getAiCacheKey());
        }
        setAiSuggestion(null);
        setError(null);
    }, [getAiCacheKey]);

    return (
        <>
            <div className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Báo cáo tồn kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Thống kê và báo cáo tình trạng tồn kho hiện tại</p>
                </div>
                <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-[#0099FF] border-2 border-[#0099FF] rounded-lg hover:bg-[#0099FF]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    title="Làm mới dữ liệu"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 21V15M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 3v6M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Làm mới
                </button>
            </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 max-w-full overflow-hidden">
                    <div className="p-6 max-w-full">
                        {/* Filter Section */}
                        <div className="mb-6 bg-gradient-to-br from-blue-50/50 to-sky-50/30 rounded-xl border border-blue-gray-200 shadow-sm overflow-hidden">
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
                                        {activeFilterCount > 0 && (
                                            <span className="px-2.5 py-0.5 bg-[#0099FF] text-white text-xs font-semibold rounded-full">
                                                {activeFilterCount} đang active
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                                        className="p-2 text-blue-gray-600 hover:text-blue-gray-800 hover:bg-blue-gray-100 rounded-lg transition-all duration-200"
                                        aria-label={filtersExpanded ? 'Thu gọn' : 'Mở rộng'}
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className={`transition-transform duration-200 ${filtersExpanded ? '' : 'rotate-180'}`}
                                        >
                                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible content */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    filtersExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                            <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                                                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                                                </svg>
                                                Mã hàng
                                            </label>
                                            <div className="relative">
                                    <input
                                        type="text"
                                        value={filterCode}
                                        onChange={(e) => setFilterCode(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400 transition-all duration-200 hover:border-[#0099FF]/50"
                                        placeholder="Nhập mã hàng"
                                    />
                                                {filterCode && (
                                                    <button
                                                        onClick={() => setFilterCode('')}
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

                                <div>
                                            <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                                                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Tên hàng hóa
                                            </label>
                                            <div className="relative">
                                    <input
                                        type="text"
                                        value={filterName}
                                        onChange={(e) => setFilterName(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400 transition-all duration-200 hover:border-[#0099FF]/50"
                                        placeholder="Nhập tên hàng"
                                    />
                                                {filterName && (
                                                    <button
                                                        onClick={() => setFilterName('')}
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

                                <div>
                                            <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                                                    <path d="M7 12l3-3 3 3 5-5M7 12l-5 5M7 12h10m5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                SL tối thiểu
                                            </label>
                                    <input
                                        type="number"
                                        value={filterMinQuantity}
                                        onChange={(e) => setFilterMinQuantity(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400 transition-all duration-200 hover:border-[#0099FF]/50"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>

                                <div>
                                            <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                                                    <path d="M7 12l3 3 3-3 5 5M7 12l-5-5M7 12h10m5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                SL tối đa
                                            </label>
                                    <input
                                        type="number"
                                        value={filterMaxQuantity}
                                        onChange={(e) => setFilterMaxQuantity(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400 transition-all duration-200 hover:border-[#0099FF]/50"
                                        placeholder="999999"
                                        min="0"
                                    />
                                </div>
                            </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                            <label className="block text-sm font-medium text-blue-gray-800 mb-2 flex items-center gap-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0099FF]">
                                                    <path d="M9 12l2 2 4-4M21 12c0 4.9706-4.0294 9-9 9s-9-4.0294-9-9 4.0294-9 9-9 9 4.0294 9 9z" strokeLinecap="round" />
                                                </svg>
                                                Tình trạng
                                            </label>
                                    <select
                                        value={filterStockStatus}
                                        onChange={(e) =>
                                            setFilterStockStatus(
                                                e.target.value as 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
                                            )
                                        }
                                                className="w-full px-4 py-2.5 bg-white border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 transition-all duration-200 hover:border-[#0099FF]/50"
                                    >
                                        <option value="ALL" className="bg-white">Tất cả</option>
                                        <option value="IN_STOCK" className="bg-white">Còn hàng</option>
                                        <option value="LOW_STOCK" className="bg-white">Sắp hết</option>
                                        <option value="OUT_OF_STOCK" className="bg-white">Hết hàng</option>
                                    </select>
                                </div>
                            </div>

                                    {error && isDataLoadError && !error.toLowerCase().includes('ai') && !error.toLowerCase().includes('quá tải') && !error.toLowerCase().includes('gemini') && (
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
                                                    {retryCount < 3 && (
                                                        <button
                                                            onClick={handleRetry}
                                                            disabled={loading}
                                                            className="text-xs font-medium text-red-700 hover:text-red-900 underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 21V15M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 3v6M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            {loading ? 'Đang thử lại...' : 'Thử lại'}
                                                        </button>
                                                    )}
                                                    {retryCount >= 3 && (
                                                        <p className="text-xs text-red-600">Đã thử lại {retryCount} lần. Vui lòng kiểm tra kết nối mạng hoặc liên hệ hỗ trợ.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-blue-gray-200">
                                <button
                                    onClick={handleReset}
                                            className="px-6 py-2.5 rounded-lg border-2 border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                                >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
                                            </svg>
                                    Đặt lại
                                </button>
                                    <button
                                        onClick={handleSearch}
                                            disabled={loading || searchLoading}
                                            className="px-6 py-2.5 rounded-lg bg-[#0099FF] hover:bg-[#0088EE] text-white font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                        >
                                            {(loading || searchLoading) ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        />
                                        </svg>
                                                    {loading ? 'Đang tải...' : 'Đang tìm kiếm...'}
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
                        </div>

                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 max-w-full">
                            <div className="bg-white rounded-xl shadow-md border-2 border-blue-gray-200 p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-gray-600 truncate mb-2">Tổng mặt hàng</p>
                                        <p className="text-xl md:text-2xl font-bold text-blue-gray-800 mt-1 leading-tight break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{totalProducts}</p>
                                    </div>
                                    <div className="w-12 h-12 flex-shrink-0 bg-[#0099FF]/10 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                                            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#0099FF] to-[#0088EE] rounded-xl shadow-md border-2 border-[#0099FF] p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-white">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-white/90 truncate mb-2">Tổng số lượng</p>
                                        <p className="text-xl md:text-2xl font-bold text-white mt-1 leading-tight break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{formatPrice(totalQuantity)}</p>
                                    </div>
                                    <div className="w-12 h-12 flex-shrink-0 bg-white/20 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                                            <path d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full animate-pulse" style={{ width: '70%' }}></div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#0099FF] to-[#0088EE] rounded-xl shadow-md border-2 border-[#0099FF] p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-white">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-white/90 truncate mb-2">Tổng giá trị</p>
                                        <p className="text-lg md:text-xl font-bold text-white mt-1 leading-tight break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{formatPrice(totalValue)}</p>
                                    </div>
                                    <div className="w-12 h-12 flex-shrink-0 bg-white/20 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                                            <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full animate-pulse" style={{ width: '85%' }}></div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-md border-2 border-yellow-200 p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-gray-600 truncate mb-2">Sắp hết hàng</p>
                                        <p className="text-xl md:text-2xl font-bold text-yellow-600 mt-1 leading-tight break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{lowStockCount}</p>
                                    </div>
                                    <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-yellow-600">
                                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-md border-2 border-red-200 p-5 min-w-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-gray-600 truncate mb-2">Hết hàng</p>
                                        <p className="text-xl md:text-2xl font-bold text-red-500 mt-1 leading-tight break-all" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{outOfStockCount}</p>
                                    </div>
                                    <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-600">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-gray-200 mb-6">
                            <div className="flex items-center gap-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-[#0099FF]" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <p className="text-sm text-blue-gray-700">Đang tải dữ liệu...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 bg-[#0099FF] rounded-full animate-pulse"></div>
                                        <p className="text-sm text-blue-gray-700">
                                            Tổng <span className="font-bold text-[#0099FF] text-base">{totalProducts}</span> mặt hàng
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-3">
                            <button
                                onClick={handleExportExcel}
                                    disabled={exportLoading !== null || !filteredData.length}
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
                                onClick={handleExportPDF}
                                    disabled={exportLoading !== null || !filteredData.length}
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
                        </div>

                        {/* AI Forecast Section - Separate section */}
                        <div className="mb-6 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <h3 className="text-base font-semibold text-blue-gray-800">
                                                AI dự báo tồn kho
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRefreshAI}
                                                className="px-3 py-1.5 text-xs font-medium text-[#0099FF] border border-[#0099FF] rounded-lg hover:bg-[#0099FF]/10 transition-colors flex items-center gap-1.5"
                                                title="Làm mới AI"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 21V15M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 3v6M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Làm mới
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAiExpanded(!aiExpanded)}
                                                className="text-blue-gray-600 hover:text-blue-gray-800 transition-colors p-1 rounded hover:bg-white/50"
                                                title={aiExpanded ? 'Thu gọn' : 'Mở rộng'}
                                            >
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    className={`transition-transform ${aiExpanded ? '' : 'rotate-180'}`}
                                                >
                                                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    {aiExpanded && (
                                        <>
                                            <p className="text-xs text-blue-gray-600 mb-3">
                                                Gửi danh sách hàng hiện tại cho AI để gợi ý SKU sắp thiếu / dư hàng.
                                            </p>
                                            <button
                                        type="button"
                                        onClick={async () => {
                                            if (process.env.NODE_ENV === 'development') {
                                                console.log('[InventoryReport] AI button clicked, filteredData.length:', filteredData.length);
                                            }
                                            if (!filteredData.length) {
                                                showToast.error('Không có dữ liệu tồn kho để phân tích.');
                                                return;
                                            }
                                            // Clear error state trước khi gọi AI (error state chỉ dành cho loadData)
                                            setError(null);
                                            setIsDataLoadError(false); // Clear flag loadData error
                                            setAiErrorShown(false); // Reset flag khi bắt đầu gọi AI mới
                                            setAiLoading(true);
                                            setAiSuggestion(null);
                                            try {
                                                // Cache (TTL + signature) to avoid calling AI repeatedly
                                                const cacheKey = getAiCacheKey();
                                                const MAX_ITEMS = 20;

                                                const buildAiItems = (avgDailySalesMap: Map<string, number>) => {
                                                    // Prioritize OUT_OF_STOCK and LOW_STOCK first
                                                    const scored = filteredData.map((p) => {
                                                        const qty = p.quantity || 0;
                                                        const avgDailySales = avgDailySalesMap.get(p.code);
                                                        const daysRemaining =
                                                            avgDailySales && avgDailySales > 0 ? qty / avgDailySales : undefined;

                                                        // smaller score = higher priority
                                                        let score = 100000;
                                                        if (qty <= 0) score = 0;
                                                        else if (daysRemaining != null) score = Math.min(9999, daysRemaining);
                                                        else if (qty <= 10) score = 50; // heuristic low stock
                                                        else score = 100 + qty; // deprioritize healthy stock

                                                        return { p, qty, avgDailySales, daysRemaining, score };
                                                    });

                                                    scored.sort((a, b) => a.score - b.score);
                                                    return scored.slice(0, MAX_ITEMS).map(({ p, qty, avgDailySales }) => ({
                                                        code: p.code,
                                                        name: p.name,
                                                        quantity: qty,
                                                        avgDailySales,
                                                    }));
                                                };

                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('[InventoryReport] Starting AI forecast...');
                                                }
                                                // Lấy dữ liệu orders để tính avgDailySales
                                                let orders: Order[] = [];
                                                try {
                                                    orders = await getOrders();
                                                } catch (err) {
                                                    console.warn('Không thể lấy dữ liệu orders:', err);
                                                }

                                                // Tính toán avgDailySales cho mỗi sản phẩm
                                                const now = new Date();
                                                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                                                // Đếm số lượng bán trong 7 ngày qua theo product code
                                                const salesByProduct = new Map<string, number>();
                                                orders.forEach(order => {
                                                    const orderDate = new Date(order.createdAt || order.orderDate || '');
                                                    if (orderDate >= sevenDaysAgo) {
                                                        order.items?.forEach(item => {
                                                            const productCode = item.productCode || item.product?.code;
                                                            if (productCode) {
                                                                const current = salesByProduct.get(productCode) || 0;
                                                                salesByProduct.set(productCode, current + (item.quantity || 0));
                                                            }
                                                        });
                                                    }
                                                });

                                                // Tính avgDailySales = tổng bán trong 7 ngày / 7
                                                const avgDailySalesMap = new Map<string, number>();
                                                filteredData.forEach((p) => {
                                                    const totalSales7Days = salesByProduct.get(p.code) || 0;
                                                    if (totalSales7Days > 0) {
                                                        avgDailySalesMap.set(p.code, totalSales7Days / 7);
                                                    }
                                                });

                                                const items = buildAiItems(avgDailySalesMap);

                                                // Signature for cache: same items + quantities + avgDailySales
                                                const sig = items
                                                    .map((i) => `${i.code}:${i.quantity}:${i.avgDailySales ?? ''}`)
                                                    .join('|');

                                                // Use cache when valid
                                                if (typeof window !== 'undefined') {
                                                    try {
                                                        const raw = sessionStorage.getItem(cacheKey);
                                                        if (raw) {
                                                            const parsed = JSON.parse(raw) as { ts: number; sig: string; data: InventoryForecastResult };
                                                            if (parsed?.data && parsed.sig === sig && Date.now() - parsed.ts <= AI_SUGGESTION_TTL_MS) {
                                                                setAiSuggestion(parsed.data);
                                                                setAiLoading(false);
                                                                return;
                                                            }
                                                        }
                                                    } catch {
                                                        // ignore cache parse errors
                                                    }
                                                }

                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('[InventoryReport] Calling AI with', items.length, 'items');
                                                }
                                                const data = await aiInventoryForecast(items);
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.log('[InventoryReport] AI response:', data ? 'success' : 'null/error');
                                                }
                                                if (!data) {
                                                    // Chỉ hiển thị toast một lần, không hiển thị error box
                                                    if (!aiErrorShown) {
                                                        showToast.error('Hiện tại hệ thống AI đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
                                                        setAiErrorShown(true);
                                                    }
                                                    return;
                                                }
                                                // Reset flag khi thành công
                                                setAiErrorShown(false);
                                                setAiSuggestion(data);
                                                // Lưu cache để khi quay lại trang không cần gọi lại AI
                                                try {
                                                    if (typeof window !== 'undefined') {
                                                        sessionStorage.setItem(
                                                            cacheKey,
                                                            JSON.stringify({ ts: Date.now(), sig, data })
                                                        );
                                                    }
                                                } catch (err) {
                                                    if (process.env.NODE_ENV === 'development') {
                                                        console.warn('⚠️ Failed to cache AI suggestion:', err);
                                                    }
                                                }
                                            } catch (err) {
                                                // Đảm bảo error state không được set với message AI
                                                setError(null);
                                                setIsDataLoadError(false);
                                                
                                                // Dùng console.warn để tránh Next.js dev overlay
                                                const message = err instanceof Error ? err.message : 'Có lỗi khi gọi AI.';
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.warn('AI inventory forecast client error:', message);
                                                }
                                                // Chỉ hiển thị toast một lần (tránh duplicate)
                                                if (!aiErrorShown) {
                                                    // Nếu message chứa "AI" hoặc "quá tải" thì dùng message chuẩn
                                                    const toastMessage = message.includes('AI') || message.includes('quá tải') || message.includes('quota') || message.includes('429')
                                                        ? 'Hiện tại hệ thống AI đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.'
                                                        : message;
                                                    showToast.error(toastMessage);
                                                    setAiErrorShown(true);
                                                }
                                            } finally {
                                                setAiLoading(false);
                                                // Đảm bảo error state luôn được clear sau khi gọi AI
                                                setError(null);
                                                setIsDataLoadError(false);
                                            }
                                        }}
                                        disabled={aiLoading}
                                        className="px-4 py-2 rounded-md bg-[#0099FF] text-white text-sm font-medium hover:bg-[#0088EE] disabled:opacity-60 transition-colors shadow-sm"
                                    >
                                        {aiLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Đang phân tích...
                                            </span>
                                        ) : (
                                            'Xin gợi ý từ AI'
                                        )}
                                    </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {aiExpanded && aiSuggestion && (
                                <div className="mt-4 bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="flex items-start gap-4 p-5">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#0099FF] to-[#0088EE] rounded-lg flex items-center justify-center shadow-sm">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-base font-bold text-blue-gray-900">Gợi ý từ AI</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setAiSuggestion(null)}
                                                    className="flex-shrink-0 text-blue-gray-400 hover:text-blue-gray-600 transition-colors p-1 rounded hover:bg-blue-gray-100"
                                                    title="Đóng"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                                {/* Summary */}
                                                {aiSuggestion.summary && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <p className="text-sm text-blue-800 leading-relaxed">
                                                            {aiSuggestion.summary}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Items at risk */}
                                                {aiSuggestion.itemsAtRisk && aiSuggestion.itemsAtRisk.length > 0 && (
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-red-700 mb-2">
                                                            SKU có nguy cơ thiếu hàng
                                                        </h5>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-xs border border-red-100 rounded-lg overflow-hidden">
                                                                <thead className="bg-red-50">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left font-semibold text-red-800">Mã</th>
                                                                        <th className="px-3 py-2 text-left font-semibold text-red-800">Tên</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-red-800">Tồn kho</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-red-800">Ước tính còn (ngày)</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-red-800">Đề xuất nhập</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {aiSuggestion.itemsAtRisk.map((item, idx) => (
                                                                        <tr key={`${item.code}-${idx}`} className="border-t border-red-100 bg-white">
                                                                            <td className="px-3 py-1.5 font-medium text-red-800">{item.code}</td>
                                                                            <td className="px-3 py-1.5 text-red-900">{item.name}</td>
                                                                            <td className="px-3 py-1.5 text-right text-red-900">
                                                                                {formatPrice(item.quantity ?? 0)}
                                                                            </td>
                                                                            <td className="px-3 py-1.5 text-right text-red-900">
                                                                                {item.daysRemaining != null ? item.daysRemaining.toFixed(1) : '-'}
                                                                            </td>
                                                                            <td className="px-3 py-1.5 text-right text-red-900">
                                                                                {item.recommendedPurchaseQty != null
                                                                                    ? formatPrice(item.recommendedPurchaseQty)
                                                                                    : '-'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Overstock items */}
                                                {aiSuggestion.overstockItems && aiSuggestion.overstockItems.length > 0 && (
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-amber-700 mb-2">
                                                            SKU tồn kho cao / dư hàng
                                                        </h5>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-xs border border-amber-100 rounded-lg overflow-hidden">
                                                                <thead className="bg-amber-50">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left font-semibold text-amber-800">Mã</th>
                                                                        <th className="px-3 py-2 text-left font-semibold text-amber-800">Tên</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-amber-800">Tồn kho</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-amber-800">Ước tính ngày tồn</th>
                                                                        <th className="px-3 py-2 text-left font-semibold text-amber-800">Gợi ý hành động</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {aiSuggestion.overstockItems.map((item, idx) => (
                                                                        <tr key={`${item.code}-${idx}`} className="border-t border-amber-100 bg-white">
                                                                            <td className="px-3 py-1.5 font-medium text-amber-800">{item.code}</td>
                                                                            <td className="px-3 py-1.5 text-amber-900">{item.name}</td>
                                                                            <td className="px-3 py-1.5 text-right text-amber-900">
                                                                                {formatPrice(item.quantity ?? 0)}
                                                                            </td>
                                                                            <td className="px-3 py-1.5 text-right text-amber-900">
                                                                                {item.daysOfStock != null ? item.daysOfStock.toFixed(1) : '-'}
                                                                            </td>
                                                                            <td className="px-3 py-1.5 text-amber-900">
                                                                                {item.recommendation || '-'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="rounded-xl border border-blue-gray-100 overflow-hidden">
                            <div className="overflow-x-auto max-w-full">
                                <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-[#0099FF] text-white h-[48px]">
                                        <th className="px-4 text-center font-bold text-sm w-[80px]">STT</th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Mã hàng</th>
                                        <th className="px-4 text-center font-bold text-sm w-[250px]">
                                            <button
                                                onClick={handleSortName}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Tên hàng hóa
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortName === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortName === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[120px]">
                                            <button
                                                onClick={handleSortQuantity}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Số lượng
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortQuantity === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortQuantity === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Đơn giá</th>
                                        <th className="px-4 text-center font-bold text-sm w-[180px]">
                                            <button
                                                onClick={handleSortValue}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Giá trị tồn
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortValue === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortValue === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Tình trạng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-3">
                                                    <svg className="animate-spin h-8 w-8 text-[#0099FF]" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <p className="text-sm text-blue-gray-600">Đang tải dữ liệu...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentData.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-gray-400">
                                                        <path d="M9 12h6m-3-3v6m-9 1V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" />
                                                    </svg>
                                                    <p className="text-sm font-medium text-blue-gray-600">Không có dữ liệu</p>
                                                    {activeFilterCount > 0 && (
                                                        <p className="text-xs text-blue-gray-500">Thử thay đổi bộ lọc để xem kết quả khác</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentData.map((record, index) => {
                                            const quantity = record.quantity || 0;
                                            const unitPrice = record.unitPrice || 0;
                                            const totalValue = quantity * unitPrice;

                                            return (
                                                <tr
                                                    key={record.id}
                                                    className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[48px]"
                                                >
                                                    <td className="px-4 text-center text-sm">
                                                        {startIndex + index + 1}
                                                    </td>
                                                    <td className="px-4 text-center text-sm font-medium">
                                                        {record.code}
                                                    </td>
                                                    <td className="px-4 text-left text-sm">
                                                        {record.name}
                                                    </td>
                                                    <td className={`px-4 text-center text-sm font-medium ${quantity === 0 ? 'text-red-600' : quantity <= 10 ? 'text-yellow-600' : 'text-blue-gray-800'
                                                        }`}>
                                                        {formatPrice(quantity)}
                                                    </td>
                                                    <td className="px-4 text-right text-sm">
                                                        {formatPrice(unitPrice)}
                                                    </td>
                                                    <td className="px-4 text-right text-sm font-medium text-green-600">
                                                        {formatPrice(totalValue)}
                                                    </td>
                                                    <td className="px-4 text-center">
                                                        {getStockStatusBadge(quantity)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </div>
                </div>
        </>
    );
}
