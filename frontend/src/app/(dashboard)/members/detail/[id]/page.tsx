'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserById, resetUserPassword, type ResetPasswordRequest } from '@/services/user.service';
import { showToast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';

export default function ChiTietThanhVien() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const id = Number(params.id);
    const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

    const { data: user, isLoading } = useQuery({
        queryKey: ['user', id],
        queryFn: () => getUserById(id),
        enabled: !!id,
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: (data: ResetPasswordRequest) => resetUserPassword(id, data),
        onSuccess: async (password) => {
            await queryClient.invalidateQueries({ queryKey: ['user', id] });
            setGeneratedPassword(password);
            showToast.success('Đặt lại mật khẩu thành công!');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
            showToast.error(message);
        },
    });

    const handleResetPassword = () => {
        confirm({
            title: 'Xác nhận đặt lại mật khẩu',
            message: `Bạn có chắc chắn muốn đặt lại mật khẩu cho "${user?.username}"?`,
            variant: 'warning',
            confirmText: 'Đặt lại',
            cancelText: 'Hủy',
            onConfirm: () => {
                resetPasswordMutation.mutate({ generateRandomPassword: true });
            },
        });
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
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết thành viên</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Thông tin chi tiết thành viên</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                            THÔNG TIN THÀNH VIÊN
                        </h2>
                        <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Tên đăng nhập */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Tên đăng nhập</label>
                            <div className="col-span-2 text-sm text-gray-900">{user.username}</div>
                        </div>

                        {/* Họ tên */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Họ tên</label>
                            <div className="col-span-2 text-sm text-gray-900">
                                {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <div className="col-span-2 text-sm text-gray-900">{user.email || '-'}</div>
                        </div>

                        {/* Số điện thoại */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                            <div className="col-span-2 text-sm text-gray-900">{user.phone || '-'}</div>
                        </div>

                        {/* Địa chỉ */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                            <div className="col-span-2 text-sm text-gray-900">{user.address || '-'}</div>
                        </div>

                        {/* Vai trò */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Vai trò</label>
                            <div className="col-span-2">
                                {user.roles && user.roles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {user.roles.map((role, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-block px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-500">-</span>
                                )}
                            </div>
                        </div>

                        {/* Trạng thái */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                            <div className="col-span-2">
                                <span
                                    className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                                        user.active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {user.active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                </span>
                            </div>
                        </div>

                        {/* Ngày tạo */}
                        {user.createdAt && (
                            <div className="grid grid-cols-3 gap-4">
                                <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                                <div className="col-span-2 text-sm text-gray-900">
                                    {new Date(user.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                            <button
                                type="button"
                                onClick={() => router.push('/members')}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                disabled={resetPasswordMutation.isPending}
                                className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resetPasswordMutation.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(`/members/edit/${id}`)}
                                className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors"
                            >
                                Chỉnh sửa
                            </button>
                        </div>

                        {/* Generated Password Display */}
                        {generatedPassword && (
                            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                                <p className="text-sm font-medium text-green-800 mb-2">
                                    Mật khẩu mới đã được tạo:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-green-900">
                                        {generatedPassword}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedPassword);
                                            showToast.success('Đã sao chép mật khẩu');
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                    >
                                        Sao chép
                                    </button>
                                </div>
                                <p className="text-xs text-green-600 mt-2">
                                    Vui lòng lưu mật khẩu này và chia sẻ với người dùng. Mật khẩu sẽ không hiển thị lại sau khi đóng trang.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

