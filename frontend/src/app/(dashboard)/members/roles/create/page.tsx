'use client';

import { FormEvent, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createRole, type CreateRoleRequest } from '@/services/role.service';
import { getAllPermissions, type Permission } from '@/services/permission.service';
import { showToast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function ThemMoiVaiTro() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.ROLE_CREATE);
    
    useEffect(() => {
        if (!userLoading && !canCreate) {
            router.replace('/members/roles');
        }
    }, [userLoading, canCreate, router]);

    const [roleCode, setRoleCode] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch permissions
    const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
        queryKey: ['permissions'],
        queryFn: () => getAllPermissions(),
        staleTime: 5 * 60 * 1000,
    });

    // Group permissions (no category anymore, just show all)
    const permissionsList = useMemo(() => {
        return permissions;
    }, [permissions]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!roleCode.trim()) {
            setError('Vui lòng nhập mã vai trò');
            return;
        }

        const trimmedRoleCode = roleCode.trim();

        if (trimmedRoleCode.length < 2 || trimmedRoleCode.length > 50) {
            setError('Mã vai trò phải có từ 2-50 ký tự');
            return;
        }

        if (trimmedRoleCode.includes(' ')) {
            setError('Mã vai trò không được chứa khoảng trắng');
            return;
        }

        // Kiểm tra format: chỉ chữ cái, số, dấu gạch dưới
        if (!/^[A-Z0-9_]+$/.test(trimmedRoleCode.toUpperCase())) {
            setError('Mã vai trò chỉ được chứa chữ cái in hoa, số và dấu gạch dưới');
            return;
        }

        try {
            setSaving(true);

            const data: CreateRoleRequest = {
                roleCode: roleCode.trim().toUpperCase(),
                displayName: displayName.trim() || undefined,
                permissionIds: selectedPermissionIds.length > 0 ? selectedPermissionIds : undefined,
            };

            await createRole(data);
            showToast.success('Tạo vai trò thành công!');
            router.push('/members/roles');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Tạo vai trò thất bại';
            setError(message);
            showToast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Thêm mới vai trò</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Tạo vai trò mới trong hệ thống</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    {error && (
                        <div id="error-message" className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg" role="alert" aria-live="polite">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Mã vai trò */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Mã vai trò <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="VD: ADMIN, MANAGER"
                                value={roleCode}
                                onChange={(e) => setRoleCode(e.target.value)}
                                aria-label="Mã vai trò"
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
                                placeholder="VD: Quản trị viên"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                aria-label="Tên hiển thị"
                            />
                        </div>

                        {/* Phân quyền */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm font-medium text-gray-700 pt-2">Phân quyền</label>
                            <div className="col-span-2">
                                {permissionsLoading ? (
                                    <p className="text-sm text-gray-500">Đang tải...</p>
                                ) : permissions.length === 0 ? (
                                    <p className="text-sm text-gray-500">Không có quyền nào</p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-4">
                                        {permissionsList.map((permission) => (
                                            <label
                                                key={permission.id}
                                                className="flex items-start gap-3 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissionIds.includes(permission.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPermissionIds([...selectedPermissionIds, permission.id]);
                                                        } else {
                                                            setSelectedPermissionIds(selectedPermissionIds.filter((id) => id !== permission.id));
                                                        }
                                                    }}
                                                    className="mt-1 w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                                    aria-label={`Quyền ${permission.displayName || permission.permissionCode}`}
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-800">
                                                        {permission.displayName || permission.permissionCode}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {permission.permissionCode}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
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

