'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
    approveInventoryCheck,
    confirmInventoryCheck,
    rejectInventoryCheck,
    deleteInventoryCheck,
    type InventoryCheck,
    type InventoryCheckDetail,
} from '@/services/inventory.service';
import { useInventoryCheck } from '@/hooks/useInventoryCheck';
import { useUser } from '@/hooks/useUser';
import { hasPermission, hasRole, PERMISSIONS } from '@/lib/permissions';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';

import { getProduct } from '@/services/product.service';

import { formatPrice, formatDateTimeWithSeconds } from '@/lib/utils';

export default function ViewInventoryCheckPage() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    // Load data với React Query cache
    const { data: checkData, isLoading: checkLoading } = useInventoryCheck(id);

    const data = checkData ?? null;
    const [items, setItems] = useState<InventoryCheckDetail[]>([]);
    const loading = checkLoading;

    useEffect(() => {
        if (!checkData) return;

        (async () => {
            try {

                // Debug: Check Data (commented for production)
                // console.log('🔍 Check Data:', checkData);

                const rawItems = checkData.items || [];
                // Debug: Raw Items (commented for production)
                // console.log('🔍 Raw Items:', rawItems);

                // Fetch thông tin sản phẩm cho từng item
                const mappedItems: InventoryCheckDetail[] = await Promise.all(
                    rawItems.map(async (it: InventoryCheckDetail) => {
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';

                        if (it.productCode && it.productName) {
                            productCode = it.productCode;
                            productName = it.productName;
                            unit = it.unit || 'Cái';
                        } else if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                productCode = product.code;
                                productName = product.name;
                                unit = 'Cái';
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                                productCode = `ID: ${it.productId}`;
                                productName = `Sản phẩm #${it.productId}`;
                            }
                        }

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            systemQuantity: it.systemQuantity ?? 0,
                            actualQuantity: it.actualQuantity ?? 0,
                            differenceQuantity: it.differenceQuantity ?? 0,
                            unitPrice: it.unitPrice ?? 0,
                            totalValue: it.totalValue ?? 0,
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
    }, [checkData]);

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
                        <p className="text-xl text-red-500">Không tìm thấy phiếu kiểm kê</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết phiếu kiểm kê</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Xem chi tiết phiếu kiểm kê kho hàng</p>
                </div>

                <div className="flex gap-6 items-start">
                    {/* Khối nội dung chính bên trái */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-gray-100">
                        <div className="p-6">
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-2xl font-bold text-blue-gray-800">
                                        PHIẾU KIỂM KÊ KHO
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

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-4">
                                    <InfoRow label="Mã phiếu" value={data.checkCode} />
                                    <InfoRow label="Kho kiểm kê" value={data.storeName || 'Kho tổng'} />
                                    <InfoRow label="Mã kho" value={data.storeCode || 'KT_5467'} />
                                </div>

                                <div className="space-y-4">
                                    <InfoRow label="Ngày kiểm kê" value={formatDateTimeWithSeconds(data.checkDate)} />
                                    <InfoRow label="Mô tả" value={data.description} multi />
                                    <InfoRow label="Ghi chú" value={data.note} multi />
                                </div>
                            </div>
                        </div>

                            {/* BẢNG SẢN PHẨM */}
                            <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#0099FF] text-white h-10">
                                        <th className="px-2 w-12">STT</th>
                                        <th className="px-2 w-40">Tên hàng hóa</th>
                                        <th className="px-2 w-24">Mã hàng</th>
                                        <th className="px-2 w-20">ĐVT</th>
                                        <th className="px-2 w-24">SL Hệ thống</th>
                                        <th className="px-2 w-24">SL Thực tế</th>
                                        <th className="px-2 w-24">Chênh lệch</th>
                                        <th className="px-2 w-28">Đơn giá</th>
                                        <th className="px-2 w-28">Giá trị CL</th>
                                        <th className="px-2 w-32">Ghi chú</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.length === 0 ? (
                                        <tr className="border-t border-blue-gray-200 h-10">
                                            <td colSpan={10} className="text-center text-blue-gray-400 py-4">
                                                Không có sản phẩm nào
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((it, i) => (
                                            <tr key={i} className="border-t border-blue-gray-200 h-10 hover:bg-blue-gray-50">
                                                <td className="text-center text-blue-gray-800">{i + 1}</td>
                                                <td className="px-2 text-blue-gray-800">{it.productName}</td>
                                                <td className="text-center text-blue-gray-800">{it.productCode}</td>
                                                <td className="text-center text-blue-gray-800">{it.unit ?? 'Cái'}</td>
                                                <td className="text-right px-2 text-blue-gray-800">
                                                    {formatPrice(it.systemQuantity)}
                                                </td>
                                                <td className="text-right px-2 text-blue-gray-800">
                                                    {formatPrice(it.actualQuantity)}
                                                </td>
                                                <td className={`text-right px-2 font-medium ${it.differenceQuantity > 0 ? 'text-green-500' : it.differenceQuantity < 0 ? 'text-red-500' : 'text-blue-gray-400'}`}>
                                                    {formatPrice(it.differenceQuantity)}
                                                </td>
                                                <td className="text-right px-2 text-blue-gray-800">
                                                    {formatPrice(it.unitPrice)}
                                                </td>
                                                <td className={`text-right px-2 font-medium ${it.totalValue > 0 ? 'text-green-500' : it.totalValue < 0 ? 'text-red-500' : 'text-blue-gray-400'}`}>
                                                    {formatPrice(it.totalValue)}
                                                </td>
                                                <td className="text-center px-2 text-xs text-blue-gray-400">
                                                    {it.note || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    <tr className="bg-blue-gray-100 font-bold h-10 border-t border-blue-gray-200">
                                        <td colSpan={8} className="text-center text-blue-gray-800">
                                            Tổng giá trị chênh lệch
                                        </td>
                                        <td className={`text-right px-4 text-blue-gray-800 ${data.totalDifferenceValue > 0 ? 'text-green-500' : data.totalDifferenceValue < 0 ? 'text-red-500' : ''}`}>
                                            {formatPrice(data.totalDifferenceValue)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
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
            <label className="w-28 text-sm pt-1 text-blue-gray-800">{label}</label>
            <div
                className={`flex-1 px-3 py-1.5 border border-blue-gray-200 bg-white text-sm text-right text-blue-gray-800 ${multi ? 'h-14' : ''
                    }`}
            >
                {value ?? ''}
            </div>
        </div>
    );
}

// Unused functions - commented out
// function getStatusText(status: string): string {
//     const statusMap: Record<string, string> = {
//         'PENDING': 'Chờ duyệt',
//         'APPROVED': 'Đã duyệt',
//         'REJECTED': 'Từ chối',
//     };
//     return statusMap[status] || status;
// }

// function getStatusColor(status: string): string {
//     const colorMap: Record<string, string> = {
//         'PENDING': 'bg-yellow-500 text-black',
//         'APPROVED': 'bg-amber-500 text-black',
//         'REJECTED': 'bg-red-500 text-black',
//     };
//     return colorMap[status] || 'bg-blue-gray-100 text-blue-gray-800';
// }

// Extended type for InventoryCheck with optional audit fields
type InventoryCheckWithAudit = InventoryCheck & {
    createdBy?: string | null;
    createdByName?: string | null;
    createdByRole?: string | null;
    createdAt?: string | null;
    createdDate?: string | null;
    approvedBy?: string | null;
    approvedByName?: string | null;
    approvedByRole?: string | null;
    approvedAt?: string | null;
    rejectedBy?: string | null;
    rejectedByName?: string | null;
    rejectedByRole?: string | null;
    rejectedAt?: string | null;
    confirmedBy?: string | null;
    confirmedByName?: string | null;
    confirmedByRole?: string | null;
    confirmedAt?: string | null;
};

function StatusSidebar({ data }: { data: InventoryCheck }) {
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const auditData = data as InventoryCheckWithAudit;
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
    const rejectedAt =
        auditData.rejectedAt ??
        (auditData as unknown as Record<string, string | undefined>).rejectedTime ??
        '';

    const confirmedBy = pickUser(
        auditData.confirmedByName,
        auditData.confirmedBy,
        (auditData as unknown as Record<string, string | undefined>).confirmerName,
        (auditData as unknown as Record<string, string | undefined>).confirmer,
        (auditData as unknown as Record<string, string | undefined>).confirmedName,
        (auditData as unknown as Record<string, string | undefined>).confirmedUser,
    );
    const confirmedByRole = auditData.confirmedByRole ?? '';
    const confirmedAt =
        auditData.confirmedAt ??
        (auditData as unknown as Record<string, string | undefined>).confirmedTime ??
        '';

    // Sử dụng formatDateTimeWithSeconds từ utils.ts

    // Kiểm tra quyền
    const canApprove = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_APPROVE);
    // Chỉ Admin mới được xác nhận cuối cùng (confirm)
    const canConfirm = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_CONFIRM) || hasRole(userRoles, ['ADMIN']);
    const canReject = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_APPROVE); // Dùng cùng quyền với approve
    const canDelete = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_DELETE);

    const handleApprove = async () => {
        if (!canApprove) {
            showToast.error('Bạn không có quyền duyệt phiếu kiểm kê');
            return;
        }
        confirm({
            title: 'Xác nhận duyệt',
            message: 'Duyệt phiếu kiểm kê này (chờ Admin xác nhận)?',
            variant: 'info',
            confirmText: 'Duyệt',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    await approveInventoryCheck(data.id);
                    showToast.success('Đã duyệt phiếu kiểm kê, chờ Admin xác nhận cuối cùng.');
                    window.location.reload();
                } catch (err) {
                    showToast.error(err || 'Lỗi duyệt phiếu');
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleConfirm = async () => {
        if (!canConfirm) {
            showToast.error('Chỉ Admin mới có quyền xác nhận cuối cùng');
            return;
        }
        confirm({
            title: 'Xác nhận phiếu kiểm kê',
            message: 'Xác nhận phiếu kiểm kê và cập nhật tồn kho?',
            variant: 'info',
            confirmText: 'Xác nhận',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    await confirmInventoryCheck(data.id);
                    showToast.success('Đã xác nhận phiếu kiểm kê thành công!');
                    window.location.reload();
                } catch (err) {
                    showToast.error(err || 'Lỗi xác nhận phiếu');
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleReject = async () => {
        if (!canReject) {
            showToast.error('Bạn không có quyền từ chối phiếu kiểm kê');
            return;
        }
        confirm({
            title: 'Xác nhận từ chối',
            message: 'Bạn chắc chắn muốn từ chối phiếu kiểm kê này?',
            variant: 'warning',
            confirmText: 'Từ chối',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    await rejectInventoryCheck(data.id, { reason: rejectReason });
                    showToast.success('Đã từ chối phiếu kiểm kê!');
                    setShowRejectModal(false);
                    setRejectReason('');
                    window.location.reload();
                } catch (err) {
                    showToast.error(err || 'Lỗi từ chối phiếu');
                } finally {
                    setProcessing(false);
                }
            },
        });
    };

    const handleDelete = async () => {
        if (!canDelete) {
            showToast.error('Bạn không có quyền xóa phiếu kiểm kê');
            return;
        }
        confirm({
            title: 'Xác nhận xóa',
            message: 'Bạn chắc chắn muốn xóa phiếu kiểm kê này?',
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setProcessing(true);
                    await deleteInventoryCheck(data.id);
                    showToast.success('Đã xóa phiếu kiểm kê!');
                    router.push('/inventory/inventory-checks');
                } catch (err) {
                    showToast.error(err || 'Lỗi xóa phiếu');
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
        <>
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
                                onClick={handleDelete}
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
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={createdByRole} label="—" />
                            </div>
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
                                title={!canConfirm ? 'Chỉ Admin mới được xác nhận cuối cùng' : ''}
                            >
                                {processing ? 'Đang xác nhận...' : 'Xác nhận'}
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
                                    onClick={() => setShowRejectModal(true)}
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
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={rejectedByRole} label="—" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                                <ReadonlyInput value={formatDateTimeWithSeconds(rejectedAt)} label="Chưa có" />
                            </div>
                        </div>
                    </div>

                    {/* Đã xác nhận bởi */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Đã xác nhận bởi
                            </span>
                            {data.status === 'APPROVED' && confirmedBy && confirmedBy !== 'Chưa có' && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700">
                                    Hoàn thành
                                </span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Người xác nhận</label>
                                <ReadonlyInput value={confirmedBy} label="Chưa có" />
                            </div>
                            {confirmedByRole && confirmedByRole.trim() !== '' && confirmedBy !== 'Chưa có' && (
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                    <ReadonlyInput value={confirmedByRole} label="—" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                                <ReadonlyInput value={formatDateTimeWithSeconds(confirmedAt)} label="Chưa có" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal từ chối */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-[500px] p-6 border border-blue-gray-200 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 text-blue-gray-800">Từ chối phiếu kiểm kê</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-blue-gray-800">
                                Lý do từ chối <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-blue-gray-300 rounded-lg bg-blue-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-24 resize-none text-blue-gray-800 placeholder:text-blue-gray-400"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Nhập lý do từ chối..."
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={processing}
                                className="px-6 py-2 bg-blue-gray-100 hover:bg-blue-gray-200 text-blue-gray-800 rounded-lg transition-colors disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processing || !rejectReason.trim()}
                                className="px-6 py-2 bg-red-400 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-60"
                            >
                                {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
