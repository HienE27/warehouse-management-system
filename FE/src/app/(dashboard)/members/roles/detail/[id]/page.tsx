'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getRoleById } from '@/services/role.service';

export default function ChiTietVaiTro() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const { data: role, isLoading } = useQuery({
        queryKey: ['role', id],
        queryFn: () => getRoleById(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0099FF]"></div>
            </div>
        );
    }

    if (!role) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Không tìm thấy vai trò</p>
                <button
                    onClick={() => router.push('/members/roles')}
                    className="mt-4 px-4 py-2 bg-[#0099FF] text-white rounded-lg"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    const permissionsByCategory: Record<string, typeof role.permissions> = {};
    if (role.permissions) {
        role.permissions.forEach((perm) => {
            // Permission type không có category, group tất cả vào "Khác"
            const category = 'Khác';
            if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
            }
            permissionsByCategory[category].push(perm);
        });
    }

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết vai trò</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Thông tin chi tiết vai trò</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                            THÔNG TIN VAI TRÒ
                        </h2>
                        <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Mã vai trò */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Mã vai trò</label>
                            <div className="col-span-2 text-sm text-gray-900 font-medium">{role.roleCode}</div>
                        </div>

                        {/* Tên hiển thị */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Tên hiển thị</label>
                            <div className="col-span-2 text-sm text-gray-900">{role.displayName || '-'}</div>
                        </div>

                        {/* Mô tả */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Mô tả</label>
                            <div className="col-span-2 text-sm text-gray-900">{role.description || '-'}</div>
                        </div>

                        {/* Phân quyền */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm font-medium text-gray-700 pt-2">Phân quyền</label>
                            <div className="col-span-2">
                                {role.permissions && role.permissions.length > 0 ? (
                                    <div className="space-y-4">
                                        {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                            <div key={category}>
                                                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
                                                    {category}
                                                </h3>
                                                <div className="space-y-2">
                                                    {perms.map((permission) => (
                                                        <div
                                                            key={permission.id}
                                                            className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                                        >
                                                            <div className="text-sm font-medium text-gray-800">
                                                                {permission.displayName || permission.permissionCode}
                                                            </div>
                                                            {permission.description && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {permission.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-500">Không có quyền nào</span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                            <button
                                type="button"
                                onClick={() => router.push('/members/roles')}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(`/members/roles/edit/${id}`)}
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

