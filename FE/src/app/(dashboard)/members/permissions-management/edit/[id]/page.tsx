'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPermissionById, updatePermission, type UpdatePermissionRequest } from '@/services/permission.service';
import { showToast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function ChinhSuaQuyen() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const id = Number(params.id);
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];
    
    const canEdit = hasPermission(userRoles, PERMISSIONS.PERMISSION_EDIT);
    
    useEffect(() => {
        if (!userLoading && !canEdit) {
            router.replace('/members/permissions-management');
        }
    }, [userLoading, canEdit, router]);

    const [permissionCode, setPermissionCode] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [error, setError] = useState<string | null>(null);

    // Fetch permission data
    const { data: permission, isLoading } = useQuery({
        queryKey: ['permission', id],
        queryFn: () => getPermissionById(id),
        enabled: !!id,
    });

    // Update form when permission data is loaded
    useEffect(() => {
        if (permission) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => {
                setPermissionCode(permission.permissionCode || '');
                setDisplayName(permission.displayName || '');
            }, 0);
        }
    }, [permission]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdatePermissionRequest) => updatePermission(id, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['permissions'] });
            await queryClient.invalidateQueries({ queryKey: ['permission', id] });
            showToast.success('Cập nhật quyền thành công!');
            router.push('/members/permissions-management');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Cập nhật quyền thất bại';
            setError(msg);
            showToast.error(msg);
        },
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!permissionCode.trim()) {
            setError('Vui lòng nhập mã quyền');
            return;
        }

        const trimmedPermissionCode = permissionCode.trim();

        if (trimmedPermissionCode.length < 2 || trimmedPermissionCode.length > 50) {
            setError('Mã quyền phải có từ 2-50 ký tự');
            return;
        }

        if (trimmedPermissionCode.includes(' ')) {
            setError('Mã quyền không được chứa khoảng trắng');
            return;
        }

        // Kiểm tra format: chỉ chữ cái, số, dấu gạch dưới
        if (!/^[A-Z0-9_]+$/.test(trimmedPermissionCode.toUpperCase())) {
            setError('Mã quyền chỉ được chứa chữ cái in hoa, số và dấu gạch dưới');
            return;
        }

        const data: UpdatePermissionRequest = {
            permissionCode: permissionCode.trim().toUpperCase(),
            displayName: displayName.trim() || undefined,
        };

        updateMutation.mutate(data);
    };

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
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa quyền</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin quyền</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    {error && (
                        <div id="error-message" className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg" role="alert" aria-live="polite">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Mã quyền */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Mã quyền <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="VD: USER_CREATE, PRODUCT_DELETE"
                                value={permissionCode}
                                onChange={(e) => setPermissionCode(e.target.value)}
                                aria-label="Mã quyền"
                                aria-describedby={error ? "error-message" : undefined}
                                required
                            />
                        </div>

                        {/* Tên hiển thị */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Tên hiển thị</label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="VD: Tạo người dùng"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                aria-label="Tên hiển thị"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={updateMutation.isPending}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    'Lưu'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

