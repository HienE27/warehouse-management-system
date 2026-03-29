'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllRoles, type Role } from '@/services/role.service';
import { updateUser, type UpdateUserRequest } from '@/services/user.service';
import { showToast } from '@/lib/toast';

interface BulkAssignRolesDialogProps {
    userIds: number[];
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkAssignRolesDialog({
    userIds,
    isOpen,
    onClose,
}: BulkAssignRolesDialogProps) {
    const queryClient = useQueryClient();
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

    // Fetch roles
    const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: () => getAllRoles(),
        staleTime: 5 * 60 * 1000,
    });

    // Bulk assign mutation
    const bulkAssignMutation = useMutation({
        mutationFn: async (data: { userIds: number[]; roleIds: number[] }) => {
            // Update each user
            await Promise.all(
                data.userIds.map((userId) =>
                    updateUser(userId, { roleIds: data.roleIds } as UpdateUserRequest)
                )
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            showToast.success(`Gán vai trò cho ${userIds.length} thành viên thành công`);
            onClose();
            setSelectedRoleIds([]);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Gán vai trò thất bại';
            showToast.error(message);
        },
    });

    const handleSubmit = () => {
        if (selectedRoleIds.length === 0) {
            showToast.error('Vui lòng chọn ít nhất một vai trò');
            return;
        }

        bulkAssignMutation.mutate({
            userIds,
            roleIds: selectedRoleIds,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-blue-gray-800 mb-4">
                        Gán vai trò cho {userIds.length} thành viên
                    </h2>

                    {rolesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0099FF]"></div>
                        </div>
                    ) : roles.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">Không có vai trò nào</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-4 mb-6">
                            {roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
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
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800">
                                            {role.displayName || role.roleCode}
                                        </div>
                                        {role.description && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {role.description}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={bulkAssignMutation.isPending}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={bulkAssignMutation.isPending || selectedRoleIds.length === 0}
                            className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {bulkAssignMutation.isPending ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang lưu...
                                </>
                            ) : (
                                'Gán vai trò'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

