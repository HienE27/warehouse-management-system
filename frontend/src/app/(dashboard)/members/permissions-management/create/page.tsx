'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPermission, type CreatePermissionRequest } from '@/services/permission.service';
import { showToast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function ThemMoiQuyen() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.PERMISSION_CREATE);
    
    useEffect(() => {
        if (!userLoading && !canCreate) {
            router.replace('/members/permissions-management');
        }
    }, [userLoading, canCreate, router]);

    const [permissionCode, setPermissionCode] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

        try {
            setSaving(true);

            const data: CreatePermissionRequest = {
                permissionCode: permissionCode.trim().toUpperCase(),
                displayName: displayName.trim() || undefined,
            };

            await createPermission(data);
            showToast.success('Tạo quyền thành công!');
            router.push('/members/permissions-management');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Tạo quyền thất bại';
            setError(message);
            showToast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Thêm mới quyền</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Tạo quyền mới trong hệ thống</p>
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
                                disabled={saving}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={saving}
                            >
                                {saving ? (
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

