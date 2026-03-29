// src/services/order.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Order } from '@/types/order';

export async function getOrders(): Promise<Order[]> {
  // order-service trả ApiResponse<List<OrderDto>>; map sang Order[] đơn giản để report dùng
  const res = await apiFetch<{
    success: boolean;
    message?: string | null;
    data: Array<{
      id: number;
      orderDate?: string;
      createdAt?: string;
      details?: Array<{ productId?: number; quantity?: number }>;
    }>;
  }>('/api/orders', { method: 'GET' });

  const list = res?.data ?? [];
  return list.map((o) => ({
    id: o.id,
    orderDate: o.orderDate ?? o.createdAt,
    createdAt: o.createdAt ?? o.orderDate,
    items: (o.details ?? []).map((d) => ({
      productCode: d.productId != null ? String(d.productId) : undefined,
      quantity: d.quantity ?? 0,
    })),
  }));
}
