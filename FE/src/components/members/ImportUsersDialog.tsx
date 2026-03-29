'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, type CreateUserRequest } from '@/services/user.service';
import { showToast } from '@/lib/toast';

interface ImportUsersDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ImportUserRow {
    'Tên đăng nhập': string;
    'Họ'?: string;
    'Tên'?: string;
    'Email'?: string;
    'Số điện thoại'?: string;
    'Địa chỉ'?: string;
    'Vai trò'?: string;
    'Trạng thái'?: string;
}

export default function ImportUsersDialog({
    isOpen,
    onClose,
}: ImportUsersDialogProps) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportUserRow[]>([]);
    const [importing, setImporting] = useState(false);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<ImportUserRow>(worksheet);
                
                setPreviewData(jsonData);
            };
            
            reader.readAsBinaryString(selectedFile);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to read file:', message);
            }
            showToast.error('Không thể đọc file. Vui lòng kiểm tra định dạng file.');
        }
    }, []);

    const createUserMutation = useMutation({
        mutationFn: (data: CreateUserRequest) => createUser(data),
    });

    const handleImport = useCallback(async () => {
        if (previewData.length === 0) {
            showToast.error('Không có dữ liệu để import');
            return;
        }

        setImporting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const row of previewData) {
                if (!row['Tên đăng nhập']) {
                    errorCount++;
                    continue;
                }

                try {
                    const userData: CreateUserRequest = {
                        username: row['Tên đăng nhập'],
                        password: 'TempPassword123!', // Default password, user should change
                        firstName: row['Họ'] || undefined,
                        lastName: row['Tên'] || undefined,
                        email: row['Email'] || undefined,
                        phone: row['Số điện thoại'] || undefined,
                        address: row['Địa chỉ'] || undefined,
                        active: row['Trạng thái'] === 'Hoạt động' || row['Trạng thái'] === undefined,
                    };

                    await createUserMutation.mutateAsync(userData);
                    successCount++;
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`Failed to create user ${row['Tên đăng nhập']}:`, message);
                    }
                    errorCount++;
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['users'] });
            
            if (successCount > 0) {
                showToast.success(`Import thành công ${successCount} thành viên${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`);
            } else {
                showToast.error('Import thất bại. Vui lòng kiểm tra dữ liệu.');
            }

            if (successCount > 0) {
                onClose();
                setFile(null);
                setPreviewData([]);
            }
        } finally {
            setImporting(false);
        }
    }, [previewData, createUserMutation, queryClient, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-blue-gray-800 mb-4">
                        Nhập thành viên từ file
                    </h2>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Chọn file Excel hoặc CSV
                        </label>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0099FF]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Hỗ trợ định dạng: .xlsx, .xls, .csv
                        </p>
                    </div>

                    {/* Preview Table */}
                    {previewData.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                                Xem trước ({previewData.length} dòng)
                            </h3>
                            <div className="border border-gray-300 rounded-md overflow-x-auto max-h-64">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Tên đăng nhập</th>
                                            <th className="px-3 py-2 text-left">Họ</th>
                                            <th className="px-3 py-2 text-left">Tên</th>
                                            <th className="px-3 py-2 text-left">Email</th>
                                            <th className="px-3 py-2 text-left">Số điện thoại</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((row, index) => (
                                            <tr key={index} className="border-t">
                                                <td className="px-3 py-2">{row['Tên đăng nhập']}</td>
                                                <td className="px-3 py-2">{row['Họ'] || '-'}</td>
                                                <td className="px-3 py-2">{row['Tên'] || '-'}</td>
                                                <td className="px-3 py-2">{row['Email'] || '-'}</td>
                                                <td className="px-3 py-2">{row['Số điện thoại'] || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 10 && (
                                    <p className="text-xs text-gray-500 p-2 text-center">
                                        ... và {previewData.length - 10} dòng khác
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={importing}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={importing || previewData.length === 0}
                            className="px-6 py-2 bg-[#0099FF] text-white rounded-md hover:bg-[#0088EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang import...
                                </>
                            ) : (
                                'Import'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

