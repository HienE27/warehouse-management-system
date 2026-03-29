// src/hooks/useAllStocks.ts
import { useQuery } from '@tanstack/react-query';
import { getAllStockPaged, type StockByStore } from '@/services/stock.service';

interface UseAllStocksOptions {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
}

/**
 * Custom hook để lấy tất cả stocks với React Query caching
 * Tự động fetch tất cả pages và cache lại
 * 
 * @param options - Options cho query
 * @param options.enabled - Có fetch hay không (default: true)
 * @param options.staleTime - Thời gian cache (default: 5 phút)
 * @param options.gcTime - Thời gian giữ cache (default: 10 phút)
 */
export function useAllStocks(options: UseAllStocksOptions = {}) {
    const { enabled = true, staleTime = 5 * 60 * 1000, gcTime = 10 * 60 * 1000 } = options;

    return useQuery<StockByStore[]>({
        queryKey: ['allStocks'],
        queryFn: async () => {
            // Fetch tất cả stocks với pagination
            const allStocks: StockByStore[] = [];
            let page = 0;
            const size = 100; // Fetch 100 records mỗi page
            let hasMore = true;

            while (hasMore) {
                const response = await getAllStockPaged({ page, size });
                allStocks.push(...response.content);
                
                hasMore = page + 1 < response.totalPages;
                page++;
                
                // Safety limit: không fetch quá 50 pages (5000 records)
                if (page >= 50) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('useAllStocks: Reached safety limit of 50 pages');
                    }
                    break;
                }
            }

            return allStocks;
        },
        enabled, // Chỉ fetch khi enabled = true
        staleTime, // Cache time
        gcTime, // Garbage collection time
        retry: 2,
        // Tối ưu: chỉ refetch khi cache hết hạn
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
}

