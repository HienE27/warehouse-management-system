/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
    type SupplierImport,
    type SupplierImportDetail,
} from '@/services/inventory.service';

import { type Supplier } from '@/services/supplier.service';
import { getProduct } from '@/services/product.service';
import { useImport } from '@/hooks/useImport';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAllStocks } from '@/hooks/useAllStocks';
import { buildImageUrl, formatDateTimeWithSeconds } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';

export default function ViewImportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    // Load data với React Query cache
    const { data: importData, isLoading: importLoading } = useImport(id);
    const { data: suppliers = [] } = useSuppliers();
    const { data: allStocks = [] } = useAllStocks();

    // Tạo stocks map từ cached data - dùng useMemo để tránh tạo mới mỗi render
    const stocksMap = useMemo(() => {
        const map = new Map<number, Map<number, number>>();
        allStocks.forEach((stock) => {
            if (!map.has(stock.productId)) {
                map.set(stock.productId, new Map());
            }
            map.get(stock.productId)!.set(stock.storeId, stock.quantity);
        });
        return map;
    }, [allStocks]);

    // Tính toán supplier và mapped import từ cached data
    const supplier = importData?.supplierId
        ? suppliers.find((s: Supplier) => s.id === importData.supplierId) ?? null
        : null;

    const data: SupplierImport | null = importData
        ? {
              ...importData,
              supplierName: supplier?.name ?? importData.supplierName ?? null,
              supplierCode: supplier?.code ?? importData.supplierCode ?? null,
              supplierPhone: supplier?.phone ?? importData.supplierPhone ?? null,
              supplierAddress: supplier?.address ?? importData.supplierAddress ?? null,
          }
        : null;

    const [items, setItems] = useState<(SupplierImportDetail & { availableQuantity?: number })[]>([]);
    const loading = importLoading;

    useEffect(() => {
        if (!importData) return;

        (async () => {
            try {
                // ---- DEBUG: Kiểm tra dữ liệu từ API (commented for production) ----
                // console.log('🔍 Import Data:', importData);

                // ---- map lại danh sách sản phẩm ----
                const rawItems = importData.items || [];

                // Debug: Raw Items (commented for production)
                // console.log('🔍 Raw Items:', rawItems);

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mappedItems: (SupplierImportDetail & { availableQuantity?: number })[] = await Promise.all(
                    rawItems.map(async (it: SupplierImportDetail) => {
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';
                        let availableQuantity: number | undefined = undefined;

                        // Nếu đã có sẵn thông tin sản phẩm từ BE
                        if (it.productCode && it.productName) {
                            productCode = it.productCode;
                            productName = it.productName;
                            unit = it.unit || 'Cái';
                        }

                        // Nếu có productId, gọi API để lấy thông tin
                        if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                if (!productCode) productCode = product.code;
                                if (!productName) productName = product.name;

                                // Lấy tồn kho từ stocksMap (cached data)
                                if (it.storeId) {
                                    const productStocks = stocksMap.get(it.productId);
                                    availableQuantity = productStocks?.get(Number(it.storeId)) ?? 0;
                                } else {
                                    availableQuantity = 0;
                                }
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                                // Fallback: hiển thị productId nếu không fetch được
                                if (!productCode) productCode = `ID: ${it.productId}`;
                                if (!productName) productName = `Sản phẩm #${it.productId}`;
                                availableQuantity = 0;
                            }
                        }

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            unitPrice: it.unitPrice ?? 0,
                            quantity: it.quantity ?? 0,
                            availableQuantity,
                        };
                    })
                );

                // Debug: Mapped Items (commented for production)
                // console.log('🔍 Mapped Items:', mappedItems);
                setItems(mappedItems);
            } catch (err: unknown) {
                console.error(err);
            }
        })();
    }, [importData, stocksMap]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                <p className="text-xl text-blue-gray-600">Đang tải...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                <p className="text-xl text-red-500">Không tìm thấy phiếu nhập</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết phiếu nhập kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Xem thông tin chi tiết phiếu nhập kho</p>
            </div>

                <div className="flex gap-6 items-start">
                    {/* Khối nội dung chính bên trái */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-bold text-blue-gray-800">
                                    PHIẾU NHẬP KHO
                                </h2>
                                <button
                                    onClick={() => router.back()}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="h-1 w-24 bg-[#0099FF] rounded-full"></div>
                        </div>

                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                Thông tin chung
                            </h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {/* Cột trái: Nguồn nhập */}
                                <div className="space-y-4">
                                    <InfoRow label="Nguồn nhập" value={data.supplierName} />

                                    {/* Hiển thị thông tin NCC dạng card giống edit */}
                                    {data.supplierId && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="font-semibold text-blue-800">Thông tin nhà cung cấp</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Mã NCC:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {data.supplierCode ?? '-'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Loại:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {supplier?.type ?? '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <InfoRow label="Số điện thoại" value={data.supplierPhone} />
                                            <InfoRow
                                                label="Địa chỉ"
                                                value={data.supplierAddress}
                                                multi
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Cột phải: Mã phiếu và lý do */}
                                <div className="space-y-4">
                                    <InfoRow label="Mã phiếu" value={data.code} />
                                    <InfoRow label="Lý do nhập" value={data.note} multi />
                                    </div>
                            </div>
                        </div>

                        {/* BẢNG SẢN PHẨM */}
                        <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[#0099FF] text-white h-12">
                                            <th className="px-4 w-12 font-semibold">STT</th>
                                            <th className="px-4 w-40 font-semibold">Tên hàng hóa</th>
                                            <th className="px-4 w-28 font-semibold">Mã hàng</th>
                                            <th className="px-4 w-20 font-semibold">ĐVT</th>
                                            <th className="px-4 w-32 font-semibold">Kho nhập</th>
                                            <th className="px-4 w-24 font-semibold">Tồn kho</th>
                                            <th className="px-4 w-28 font-semibold">Đơn giá</th>
                                            <th className="px-4 w-20 font-semibold">SL</th>
                                            <th className="px-4 w-24 font-semibold">Chiết khấu (%)</th>
                                            <th className="px-4 w-28 font-semibold">Thành tiền</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr className="border-t h-10">
                                                <td colSpan={10} className="text-center text-gray-500 py-4">
                                                    Không có sản phẩm nào
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((it, i) => (
                                                <tr key={i} className="border-b border-gray-200 h-12 hover:bg-blue-50 transition-colors">
                                                    <td className="text-center">{i + 1}</td>
                                                    <td className="px-2">{it.productName}</td>
                                                    <td className="text-center">{it.productCode}</td>
                                                    <td className="text-center">{it.unit ?? 'Cái'}</td>
                                                    <td className="px-2 text-sm">
                                                        {it.storeName || (it.storeId ? `Kho #${it.storeId}` : '-')}
                                                        {it.storeCode && ` (${it.storeCode})`}
                                                    </td>
                                                    <td className="text-center">
                                                        {it.availableQuantity !== undefined
                                                            ? it.availableQuantity.toLocaleString('vi-VN')
                                                            : '-'}
                                                    </td>
                                                    <td className="text-right">
                                                        {Number(it.unitPrice).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="text-center">{it.quantity}</td>
                                                    <td className="text-center">{it.discountPercent ?? 0}</td>
                                                    <td className="text-right font-semibold text-gray-800">
                                                        {(() => {
                                                            const price = Number(it.unitPrice);
                                                            const qty = it.quantity;
                                                            const discount = it.discountPercent ?? 0;
                                                            let total = price * qty;
                                                            if (discount > 0) {
                                                                total = (total * (100 - discount)) / 100;
                                                            }
                                                            return total.toLocaleString('vi-VN');
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}

                                        <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
                                            <td colSpan={9} className="text-center text-gray-800">
                                                Tổng
                                            </td>
                                            <td className="text-right px-4 text-lg text-blue-700">
                                                {data.totalValue.toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* HÌNH ẢNH */}
                        <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 rounded-lg shadow-sm mb-6">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                Hợp đồng / Ảnh đính kèm
                            </h3>

                            <div className="flex gap-4 flex-wrap">
                                {(!data.attachmentImages ||
                                    data.attachmentImages.length === 0) && (
                                        <p className="text-gray-600">Không có ảnh</p>
                                    )}

                                {data.attachmentImages?.map((img, idx) => {
                                    const url = buildImageUrl(img);
                                    return (
                                        <div
                                            key={idx}
                                            className="w-[180px] h-[240px] bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden group"
                                        >
                                            {url ? (
                                                <img
                                                    src={url}
                                                    className="w-full h-full object-contain"
                                                    alt={`Ảnh ${idx + 1}`}
                                                />
                                            ) : (
                                                <span className="text-gray-400">No Image</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Panel Tình trạng bên phải */}
                    <div className="w-[320px] shrink-0">
                        <StatusSidebar data={data} />
                    </div>
                </div>
        </>
    );
}

/* ---------- COMPONENTS ---------- */
interface InfoRowProps {
    label: string;
    value?: string | null;
    multi?: boolean;
}

function InfoRow({ label, value, multi = false }: InfoRowProps) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-32 pt-1 text-sm font-medium text-gray-700 whitespace-nowrap">{label}</label>
            <div
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm ${multi ? 'h-20' : ''
                    }`}
            >
                {value ?? '—'}
            </div>
        </div>
    );
}

// Extended type for SupplierImport with optional audit fields
type SupplierImportWithAudit = SupplierImport & {
    createdByName?: string;
    createdByRole?: string;
    createdBy?: string;
    createdAt?: string;
    createdDate?: string;
    approvedByName?: string;
    approvedByRole?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedByName?: string;
    rejectedByRole?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    importedByName?: string;
    importedByRole?: string;
    importedBy?: string;
    importedAt?: string;
};

// function StatusSidebar({ data }: { data: SupplierImport }) {
//     const [processing, setProcessing] = useState(false);

//     const handleConfirm = async () => {
//         if (!confirm('Xác nhận nhập kho? Tồn kho sẽ được cập nhật.')) return;

//         try {
//             setProcessing(true);
//             const { confirmImport } = await import('@/services/inventory.service');
//             await confirmImport(data.id);
//             alert('Đã xác nhận nhập kho thành công!');
//             // Reload lại trang để cập nhật trạng thái
//             window.location.reload();
//         } catch (err) {
//             alert(err instanceof Error ? err.message : 'Lỗi xác nhận');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     const handleCancel = async () => {
//         if (!confirm('Hủy phiếu nhập này?')) return;

//         try {
//             setProcessing(true);
//             const { cancelImport } = await import('@/services/inventory.service');
//             await cancelImport(data.id);
//             alert('Đã hủy phiếu nhập!');
//             // Reload lại trang để cập nhật trạng thái
//             window.location.reload();
//         } catch (err) {
//             alert(err instanceof Error ? err.message : 'Lỗi hủy phiếu');
//         } finally {
//             setProcessing(false);
//         }
//     };

//     return (
//         <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-200">
//             <h3 className="text-base font-bold mb-4 text-blue-gray-800 flex items-center gap-2">
//                 <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
//                 Tình trạng
//             </h3>

//             <div className="space-y-4">
//                 <div className="px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg">
//                     <div className="text-sm font-bold mb-1 text-blue-gray-800">Trạng thái</div>
//                     <div className="text-sm text-blue-gray-800">{getStatusText(data.status)}</div>
//                 </div>

//                 <div className="px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg">
//                     <div className="text-sm font-bold mb-1 text-blue-gray-800">Tổng giá trị</div>
//                     <div className="text-sm font-semibold text-blue-700">{data.totalValue.toLocaleString('vi-VN')}</div>
//                 </div>

//                 {data.status === 'PENDING' && (
//                     <div className="space-y-3 mt-4">
//                         <button
//                             onClick={handleConfirm}
//                             disabled={processing}
//                             className="w-full px-4 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold disabled:opacity-60 shadow-sm transition-colors flex items-center justify-center gap-2"
//                         >
//                             {processing ? (
//                                 <>
//                                     <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                     </svg>
//                                     Đang xử lý...
//                                 </>
//                             ) : (
//                                 <>
//                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                                     </svg>
//                                     Nhập kho
//                                 </>
//                             )}
//                         </button>
//                         <button
//                             onClick={handleCancel}
//                             disabled={processing}
//                             className="w-full px-4 py-2.5 bg-red-400 hover:bg-red-500 text-white rounded-lg font-semibold disabled:opacity-60 shadow-sm transition-colors flex items-center justify-center gap-2"
//                         >
//                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                             </svg>
//                             Hủy phiếu
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }


function StatusSidebar({ data }: { data: SupplierImport }) {
    const [processing, setProcessing] = useState(false);
    const auditData = data as SupplierImportWithAudit;
    // Debug: log audit data to check role fields (commented for production)
    // console.log('🔍 Audit Data:', {
    //     createdByRole: auditData.createdByRole,
    //     approvedByRole: auditData.approvedByRole,
    //     rejectedByRole: auditData.rejectedByRole,
    //     importedByRole: auditData.importedByRole,
    //     createdByName: auditData.createdByName,
    //     approvedByName: auditData.approvedByName,
    // });
    const { user } = useUser();
    const userRoles = user?.roles || [];
    const { confirm } = useConfirm();

    const pickUser = (...values: Array<string | number | null | undefined>) => {
        for (const v of values) {
            if (v === null || v === undefined) continue;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'string' && v.trim().length > 0) return v.trim();
        }
        return 'Chưa có';
    };

    const createdBy = pickUser(
        auditData.createdByName,
        auditData.createdBy,
        (auditData as unknown as Record<string, string | undefined>).creatorName,
        (auditData as unknown as Record<string, string | undefined>).creator,
        (auditData as unknown as Record<string, string | undefined>).createdName,
        (auditData as unknown as Record<string, string | undefined>).createBy,
        (auditData as unknown as Record<string, string | undefined>).createUser,
        (auditData as unknown as Record<string, string | undefined>).createdByFullName,
        (auditData as unknown as Record<string, string | undefined>).createdByUsername,
    );
    const createdByRole = auditData.createdByRole ?? '';
    // Debug: log role data (commented for production)
    // if (createdByRole) {
    //     console.log('🔍 createdByRole:', createdByRole);
    // }
    const createdAt =
        auditData.createdAt ??
        auditData.createdDate ??
        (auditData as unknown as Record<string, string | undefined>).createdTime ??
        (auditData as unknown as Record<string, string | undefined>).createTime ??
        '';

    const approvedBy = pickUser(
        auditData.approvedByName,
        auditData.approvedBy,
        (auditData as unknown as Record<string, string | undefined>).approverName,
        (auditData as unknown as Record<string, string | undefined>).approver,
        (auditData as unknown as Record<string, string | undefined>).approvedName,
        (auditData as unknown as Record<string, string | undefined>).approvedUser,
    );
    const approvedByRole = auditData.approvedByRole ?? '';
    // Debug: log role data (commented for production)
    // if (approvedByRole) {
    //     console.log('🔍 approvedByRole:', approvedByRole);
    // }
    const approvedAt =
        auditData.approvedAt ??
        (auditData as unknown as Record<string, string | undefined>).approvedTime ??
        '';

    const rejectedBy = pickUser(
        auditData.rejectedByName,
        auditData.rejectedBy,
        (auditData as unknown as Record<string, string | undefined>).rejectorName,
        (auditData as unknown as Record<string, string | undefined>).rejector,
        (auditData as unknown as Record<string, string | undefined>).rejectedName,
        (auditData as unknown as Record<string, string | undefined>).rejectedUser,
    );
    const rejectedByRole = auditData.rejectedByRole ?? '';
    // Debug: log role data (commented for production)
    // if (rejectedByRole) {
    //     console.log('🔍 rejectedByRole:', rejectedByRole);
    // }
    const rejectedAt =
        auditData.rejectedAt ??
        (auditData as unknown as Record<string, string | undefined>).rejectedTime ??
        '';

    const importedBy = pickUser(
        auditData.importedByName,
        auditData.importedBy,
        (auditData as unknown as Record<string, string | undefined>).importerName,
        (auditData as unknown as Record<string, string | undefined>).importer,
        (auditData as unknown as Record<string, string | undefined>).importedName,
        (auditData as unknown as Record<string, string | undefined>).importedUser,
    );
    const importedByRole = auditData.importedByRole ?? '';
    // Debug: log role data (commented for production)
    // if (importedByRole) {
    //     console.log('🔍 importedByRole:', importedByRole);
    // }
    const importedAt =
        auditData.importedAt ??
        (auditData as unknown as Record<string, string | undefined>).importedTime ??
        '';

    // Sử dụng formatDateTimeWithSeconds từ utils.ts

    // Kiểm tra quyền
    const canApprove = hasPermission(userRoles, PERMISSIONS.IMPORT_APPROVE);
    // Chỉ role có IMPORT_CONFIRM (thường là Admin) mới được nhập kho
    const canConfirm = hasPermission(userRoles, PERMISSIONS.IMPORT_CONFIRM);
    const canReject = hasPermission(userRoles, PERMISSIONS.IMPORT_REJECT);
    const canCancel = hasPermission(userRoles, PERMISSIONS.IMPORT_CANCEL);
    const canDelete = hasPermission(userRoles, PERMISSIONS.IMPORT_DELETE);

    const handleApprove = async () => {
        if (!canApprove) {
            showToast.error('Bạn không có quyền duyệt phiếu nhập');
            return;
        }
        confirm({
            title: 'Xác nhận duyệt',
            message: 'Duyệt phiếu nhập này (chờ nhập kho)?',
            variant: 'info',
            confirmText: 'Duyệt',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    const { approveImport } = await import('@/services/inventory.service');
                    await approveImport(data.id);
                    showToast.success('Đã duyệt phiếu nhập, chờ Admin nhập kho.');
                    window.location.reload();
                } catch (err: unknown) {
                    console.error('Approve import error:', err);
                    const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Lỗi duyệt phiếu';
                    showToast.error(errorMessage);
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleConfirm = async () => {
        if (!canConfirm) {
            showToast.error('Chỉ Admin mới có quyền nhập kho bước cuối');
            return;
        }
        confirm({
            title: 'Xác nhận nhập kho',
            message: 'Xác nhận nhập kho và cập nhật tồn kho?',
            variant: 'info',
            confirmText: 'Xác nhận',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    const { confirmImport } = await import('@/services/inventory.service');
                    await confirmImport(data.id);
                    showToast.success('Đã nhập kho thành công!');
                    window.location.reload();
                } catch (err: unknown) {
                    console.error('Confirm import error:', err);
                    const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Lỗi nhập kho';
                    showToast.error(errorMessage);
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleReject = async () => {
        if (!canReject) {
            showToast.error('Bạn không có quyền từ chối phiếu nhập');
            return;
        }
        confirm({
            title: 'Xác nhận từ chối',
            message: 'Bạn chắc chắn muốn từ chối phiếu nhập này?',
            variant: 'warning',
            confirmText: 'Từ chối',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    const { rejectImport } = await import('@/services/inventory.service');
                    await rejectImport(data.id);
                    showToast.success('Đã từ chối phiếu nhập!');
                    window.location.reload();
                } catch (err: unknown) {
                    console.error('Reject import error:', err);
                    const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Lỗi từ chối phiếu';
                    showToast.error(errorMessage);
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleCancel = async () => {
        if (!canCancel) {
            showToast.error('Bạn không có quyền hủy phiếu nhập');
            return;
        }
        confirm({
            title: 'Xác nhận hủy',
            message: 'Bạn chắc chắn muốn hủy / xoá phiếu nhập này?',
            variant: 'danger',
            confirmText: 'Hủy',
            cancelText: 'Không',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    const { cancelImport } = await import('@/services/inventory.service');
                    await cancelImport(data.id);
                    showToast.success('Đã hủy phiếu nhập!');
                    window.location.reload();
                } catch (err: unknown) {
                    console.error('Cancel import error:', err);
                    const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Lỗi hủy phiếu';
                    showToast.error(errorMessage);
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const isPending = data.status === 'PENDING';
    const isApproved = data.status === 'APPROVED';

    const ReadonlyInput = ({ value, fallback = '—', label }: { value?: string; fallback?: string; label?: string }) => {
        const display = value && value.trim() !== '' && value !== 'Chưa có' ? value : fallback;
        const isEmpty = !value || value.trim() === '' || value === 'Chưa có';
        return (
            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={display}
                    className={`w-full h-9 px-3 text-sm bg-white border rounded-md focus:outline-none ${
                        isEmpty ? 'border-gray-200 bg-gray-50 text-gray-400 italic' : 'border-gray-300 text-gray-800'
                    }`}
                    placeholder={label}
                />
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-200 p-6">
            <h3 className="text-base font-bold mb-5 text-blue-gray-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                Tình trạng
            </h3>

            <div className="space-y-5">
                {/* Tạo bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Tạo bởi
                        </span>
                        <button
                            onClick={handleCancel}
                            disabled={processing || !isPending || !canDelete}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FFB55A] hover:bg-[#FFA042] text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            title={!canDelete ? 'Bạn không có quyền xóa phiếu' : ''}
                        >
                            Xóa
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người tạo</label>
                            <ReadonlyInput value={createdBy} label="Chưa có" />
                        </div>
                        {createdByRole && createdByRole.trim() !== '' && createdBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={createdByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(createdAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Duyệt bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Duyệt bởi
                        </span>
                        {isPending && (
                            <button
                                onClick={handleApprove}
                                disabled={processing || !canApprove}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FFC947] hover:bg-[#FFB800] text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title={!canApprove ? 'Bạn không có quyền duyệt phiếu' : ''}
                            >
                                {processing ? 'Đang duyệt...' : 'Duyệt'}
                            </button>
                        )}
                        {isApproved && (
                            <button
                                onClick={handleConfirm}
                                disabled={processing || !canConfirm}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors shadow-sm ${canConfirm
                                    ? 'bg-[#00B894] hover:bg-[#00A884]'
                                    : 'bg-[#B0B4BA] cursor-not-allowed'
                                    }`}
                                title={!canConfirm ? 'Chỉ Admin mới được nhập kho' : ''}
                            >
                                {processing ? 'Đang nhập kho...' : 'Nhập kho'}
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người duyệt</label>
                            <ReadonlyInput value={approvedBy} label="Chưa có" />
                        </div>
                        {approvedByRole && approvedByRole.trim() !== '' && approvedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={approvedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(approvedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Từ chối bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Từ chối bởi
                        </span>
                        {isPending && (
                            <button
                                onClick={handleReject}
                                disabled={processing || !canReject}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F97070] hover:bg-[#F85A5A] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title={!canReject ? 'Bạn không có quyền từ chối phiếu' : ''}
                            >
                                Từ chối
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người từ chối</label>
                            <ReadonlyInput value={rejectedBy} label="Chưa có" />
                        </div>
                        {rejectedByRole && rejectedByRole.trim() !== '' && rejectedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={rejectedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(rejectedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Đã nhập bởi */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Đã nhập bởi
                        </span>
                        {data.status === 'IMPORTED' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700">
                                Hoàn thành
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người nhập kho</label>
                            <ReadonlyInput value={importedBy} label="Chưa có" />
                        </div>
                        {importedByRole && importedByRole.trim() !== '' && importedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={importedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(importedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
