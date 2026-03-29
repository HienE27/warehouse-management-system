'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createUser, type CreateUserRequest } from '@/services/user.service';
import { getAllRoles, type Role } from '@/services/role.service';
import { showToast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function ThemMoiThanhVien() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];
    
    const canCreate = hasPermission(userRoles, PERMISSIONS.MEMBER_CREATE);
    
    useEffect(() => {
        if (!userLoading && !canCreate) {
            router.replace('/members');
        }
    }, [userLoading, canCreate, router]);

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

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch roles
    const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: () => getAllRoles(),
        staleTime: 5 * 60 * 1000,
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!username || !password) {
            setError('Vui lòng nhập Tên đăng nhập và Mật khẩu');
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

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
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
            setSaving(true);

            const data: CreateUserRequest = {
                username,
                password,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                email: email || undefined,
                phone: phone || undefined,
                address: address || undefined,
                active,
                roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
            };

            await createUser(data);
            showToast.success('Tạo thành viên thành công!');
            router.push('/members');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Tạo mới thành viên thất bại';
            setError(msg);
            showToast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Thêm thành viên</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Tạo mới thành viên hệ thống</p>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                            THÊM MỚI THÀNH VIÊN
                        </h2>
                        <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                    </div>

                    {error && (
                        <div id="error-message" className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2" role="alert" aria-live="polite">
                            {error}
                        </div>
                    )}

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

                        {/* Mật khẩu */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-label="Mật khẩu"
                                aria-describedby={error ? "error-message" : undefined}
                                required
                                minLength={6}
                            />
                        </div>

                        {/* Xác nhận mật khẩu */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Xác nhận mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] transition-all"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                aria-label="Xác nhận mật khẩu"
                                aria-describedby={error ? "error-message" : undefined}
                                required
                                minLength={6}
                            />
                        </div>

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

