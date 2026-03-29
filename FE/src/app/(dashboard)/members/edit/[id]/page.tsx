'use client';

import { FormEvent, useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserById, updateUser, updateUserPermissions, type UpdateUserRequest, type UpdateUserPermissionsRequest } from '@/services/user.service';
import { getAllRoles, type Role } from '@/services/role.service';
import { getAllPermissions, type Permission } from '@/services/permission.service';
import { showToast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function ChinhSuaThanhVien() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const id = Number(params.id);
    // Current logged-in user (rename to avoid conflict with fetched member `user`)
    const { user: currentUser, loading: currentUserLoading } = useUser();
    const userRoles = currentUser?.roles || [];

    const canEdit = hasPermission(userRoles, PERMISSIONS.MEMBER_EDIT);

    useEffect(() => {
        if (!currentUserLoading && !canEdit) {
            router.replace('/members');
        }
    }, [currentUserLoading, canEdit, router]);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [active, setActive] = useState(true);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'roles' | 'permissions'>('info');

    const [error, setError] = useState<string | null>(null);

    // Fetch roles
    const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: () => getAllRoles(),
        staleTime: 5 * 60 * 1000,
    });

    // Fetch permissions
    const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
        queryKey: ['permissions'],
        queryFn: () => getAllPermissions(),
        staleTime: 5 * 60 * 1000,
    });

    const permissionsByCategory = useMemo(() => {
        const grouped: Record<string, Permission[]> = {};
        permissions.forEach((perm) => {
            // Permission type không có category, group tất cả vào "Khác"
            const category = 'Khác';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(perm);
        });
        return grouped;
    }, [permissions]);

    // Fetch user data
    const { data: user, isLoading } = useQuery({
        queryKey: ['user', id],
        queryFn: () => getUserById(id),
        enabled: !!id,
    });

    // Update form when user data is loaded
    useEffect(() => {
        if (user && roles.length > 0) {
            setUsername(user.username || '');
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setAddress(user.address || '');
            setActive(user.active ?? true);
            
            // Map role codes to role IDs
            if (user.roles && Array.isArray(user.roles)) {
                const roleIds = roles
                    .filter((role) => user.roles?.includes(role.roleCode))
                    .map((role) => role.id);
                setSelectedRoleIds(roleIds);
            } else {
                setSelectedRoleIds([]);
            }

            // Map permission codes to permission IDs
            if (user.permissions && Array.isArray(user.permissions) && permissions.length > 0) {
                const permissionIds = permissions
                    .filter((perm) => user.permissions?.includes(perm.permissionCode))
                    .map((perm) => perm.id);
                setSelectedPermissionIds(permissionIds);
            } else {
                setSelectedPermissionIds([]);
            }
        }
    }, [user, roles, permissions]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdateUserRequest) => updateUser(id, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['user', id] });
            showToast.success('Cập nhật thành viên thành công!');
            router.push('/members');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Cập nhật thành viên thất bại';
            setError(msg);
            showToast.error(msg);
        },
    });

    // Update permissions mutation
    const updatePermissionsMutation = useMutation({
        mutationFn: (data: UpdateUserPermissionsRequest) => updateUserPermissions(id, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['user', id] });
            showToast.success('Cập nhật quyền hạn thành công!');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Cập nhật quyền hạn thất bại';
            setError(msg);
            showToast.error(msg);
        },
    });

    // Handle update roles
    const handleUpdateRoles = async () => {
        setError(null);
        try {
            const data: UpdateUserRequest = {
                username: user?.username || '',
                roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
            };
            updateMutation.mutate(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Cập nhật vai trò thất bại';
            setError(msg);
        }
    };

    // Handle update permissions
    const handleUpdatePermissions = async () => {
        setError(null);
        try {
            const data: UpdateUserPermissionsRequest = {
                permissionIds: selectedPermissionIds.length > 0 ? selectedPermissionIds : [],
            };
            updatePermissionsMutation.mutate(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Cập nhật quyền hạn thất bại';
            setError(msg);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!username) {
            setError('Vui lòng nhập Tên đăng nhập');
            return;
        }

        // Username validation
        if (username.length < 3 || username.length > 50) {
            setError('Tên đăng nhập phải có từ 3-50 ký tự');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
            return;
        }

        if (password && password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (password && password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        // Email validation
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Email không hợp lệ');
            return;
        }

        // Phone validation (Vietnamese format)
        if (phone && !/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ''))) {
            setError('Số điện thoại không hợp lệ (10-11 chữ số)');
            return;
        }

        try {
            const data: UpdateUserRequest = {
                username,
                ...(password && { password }),
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                email: email || undefined,
                phone: phone || undefined,
                address: address || undefined,
                active,
                roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
            };

            updateMutation.mutate(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Cập nhật thành viên thất bại';
            setError(msg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0099FF]"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Không tìm thấy thành viên</p>
                <button
                    onClick={() => router.push('/members')}
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
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa thành viên</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin thành viên</p>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                            CHỈNH SỬA THÀNH VIÊN
                        </h2>
                        <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('info')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${
                                    activeTab === 'info'
                                        ? 'text-[#0099FF] border-b-2 border-[#0099FF]'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Thông tin
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('roles')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${
                                    activeTab === 'roles'
                                        ? 'text-[#0099FF] border-b-2 border-[#0099FF]'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Vai trò
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('permissions')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${
                                    activeTab === 'permissions'
                                        ? 'text-[#0099FF] border-b-2 border-[#0099FF]'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Quyền trực tiếp
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div id="error-message" className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2" role="alert" aria-live="polite">
                            {error}
                        </div>
                    )}

                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                        {/* Tên đăng nhập */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Tên đăng nhập <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                aria-label="Tên đăng nhập"
                                aria-describedby={error ? "error-message" : undefined}
                                required
                            />
                        </div>

                        {/* Mật khẩu (optional) */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Mật khẩu mới</label>
                            <input
                                type="password"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Để trống nếu không đổi mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-label="Mật khẩu mới"
                                aria-describedby={error ? "error-message" : undefined}
                                minLength={6}
                            />
                        </div>

                        {/* Xác nhận mật khẩu */}
                        {password && (
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Xác nhận mật khẩu mới
                                </label>
                                <input
                                    type="password"
                                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    aria-label="Xác nhận mật khẩu mới"
                                    aria-describedby={error ? "error-message" : undefined}
                                    minLength={6}
                                />
                            </div>
                        )}

                        {/* Họ */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Họ</label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập họ"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                aria-label="Họ"
                            />
                        </div>

                        {/* Tên */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Tên</label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập tên"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                aria-label="Tên"
                            />
                        </div>

                        {/* Email */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="Email"
                            />
                        </div>

                        {/* Số điện thoại */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập số điện thoại"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                aria-label="Số điện thoại"
                            />
                        </div>

                        {/* Địa chỉ */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm font-medium text-gray-700 pt-2">Địa chỉ</label>
                            <textarea
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] h-24 resize-none"
                                placeholder="Nhập địa chỉ"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                aria-label="Địa chỉ"
                            />
                        </div>

                        {/* Vai trò */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm font-medium text-gray-700 pt-2">Vai trò</label>
                            <div className="col-span-2">
                                {rolesLoading ? (
                                    <p className="text-sm text-gray-500">Đang tải...</p>
                                ) : roles.length === 0 ? (
                                    <p className="text-sm text-gray-500">Không có vai trò nào</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                                        {roles.map((role) => (
                                            <label
                                                key={role.id}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoleIds.includes(role.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedRoleIds([...selectedRoleIds, role.id]);
                                                        } else {
                                                            setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                                    aria-label={`Vai trò ${role.displayName || role.roleCode}`}
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {role.displayName || role.roleCode}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trạng thái */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                            <div className="col-span-2 flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={(e) => setActive(e.target.checked)}
                                        className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                        aria-label="Trạng thái hoạt động"
                                    />
                                    <span className="text-sm text-gray-700">Đang hoạt động</span>
                                </label>
                            </div>
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
                    )}

                    {/* Roles Tab */}
                    {activeTab === 'roles' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="grid grid-cols-3 gap-4 items-start">
                                <label className="text-sm font-medium text-gray-700 pt-2">Vai trò</label>
                                <div className="col-span-2">
                                    {rolesLoading ? (
                                        <p className="text-sm text-gray-500">Đang tải...</p>
                                    ) : roles.length === 0 ? (
                                        <p className="text-sm text-gray-500">Không có vai trò nào</p>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-3">
                                            {roles.map((role) => (
                                                <label
                                                    key={role.id}
                                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRoleIds.includes(role.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRoleIds([...selectedRoleIds, role.id]);
                                                            } else {
                                                                setSelectedRoleIds(selectedRoleIds.filter((rId) => rId !== role.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                                        aria-label={`Vai trò ${role.displayName || role.roleCode}`}
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        {role.displayName || role.roleCode}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                    type="button"
                                    onClick={handleUpdateRoles}
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
                                        'Lưu vai trò'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="grid grid-cols-3 gap-4 items-start">
                                <label className="text-sm font-medium text-gray-700 pt-2">Quyền hạn trực tiếp</label>
                                <div className="col-span-2">
                                    {permissionsLoading ? (
                                        <p className="text-sm text-gray-500">Đang tải...</p>
                                    ) : permissions.length === 0 ? (
                                        <p className="text-sm text-gray-500">Không có quyền hạn nào</p>
                                    ) : (
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                                <div key={category} className="border border-gray-300 rounded-md p-3">
                                                    <h3 className="text-sm font-semibold text-gray-800 mb-2">{category}</h3>
                                                    <div className="space-y-2">
                                                        {perms.map((permission) => (
                                                            <label
                                                                key={permission.id}
                                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPermissionIds.includes(permission.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedPermissionIds([...selectedPermissionIds, permission.id]);
                                                                        } else {
                                                                            setSelectedPermissionIds(selectedPermissionIds.filter((pId) => pId !== permission.id));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-[#0099FF] border-gray-300 rounded focus:ring-[#0099FF]"
                                                                    aria-label={`Quyền ${permission.displayName || permission.permissionCode}`}
                                                                />
                                                                <span className="text-sm text-gray-700">
                                                                    {permission.displayName || permission.permissionCode}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={updatePermissionsMutation.isPending}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdatePermissions}
                                    className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    disabled={updatePermissionsMutation.isPending}
                                >
                                    {updatePermissionsMutation.isPending ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        'Lưu quyền hạn'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

