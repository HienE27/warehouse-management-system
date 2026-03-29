'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPermissionById } from '@/services/permission.service';

export default function ChiTietQuyen() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const { data: permission, isLoading } = useQuery({
        queryKey: ['permission', id],
        queryFn: () => getPermissionById(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0099FF]"></div>
            </div>
        );
    }

    if (!permission) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Không tìm thấy quyền</p>
                <button
                    onClick={() => router.push('/members/permissions-management')}
                    className="mt-4 px-4 py-2 bg-[#0099FF] text-white rounded-lg"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết quyền</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Thông tin chi tiết quyền</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                            THÔNG TIN QUYỀN
                        </h2>
                        <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Mã quyền */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Mã quyền</label>
                            <div className="col-span-2 text-sm text-gray-900 font-medium">{permission.permissionCode}</div>
                        </div>

                        {/* Tên hiển thị */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Tên hiển thị</label>
                            <div className="col-span-2 text-sm text-gray-900">{permission.displayName || '-'}</div>
                        </div>

                        {/* Ngày tạo */}
                        {permission.createdAt && (
                            <div className="grid grid-cols-3 gap-4">
                                <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                                <div className="col-span-2 text-sm text-gray-900">
                                    {new Date(permission.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                            <button
                                type="button"
                                onClick={() => router.push('/members/permissions-management')}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(`/members/permissions-management/edit/${id}`)}
                                className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors"
                            >
                                Chỉnh sửa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

