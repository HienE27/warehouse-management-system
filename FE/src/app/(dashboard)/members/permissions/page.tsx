'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { getAllRoles, updateRolePermissions, type Role, type Permission } from '@/services/role.service';
import { getAllPermissions } from '@/services/permission.service';

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'Nhập kho': '📥',
  'Xuất kho': '📤',
  'Kiểm kê': '📋',
  'Sản phẩm': '📦',
  'Danh mục': '📁',
  'Nhà cung cấp': '🏢',
  'Khách hàng': '👥',
  'Cửa hàng': '🏪',
  'Đơn vị': '📏',
  'Báo cáo': '📊',
  'Thành viên': '👤',
  'Vai trò': '🔐',
  'Quyền': '🔑',
  'Nhật ký': '📝',
  'Khác': '⚙️',
};

// Group categories into sections
const categoryGroups: Record<string, { name: string; icon: string; categories: string[]; color: string }> = {
  warehouse: {
    name: 'Quản lý kho',
    icon: '🏭',
    color: 'bg-[#0099FF]',
    categories: ['Nhập kho', 'Xuất kho', 'Kiểm kê'],
  },
  products: {
    name: 'Quản lý sản phẩm',
    icon: '📦',
    color: 'bg-[#0099FF]',
    categories: ['Sản phẩm', 'Danh mục', 'Nhà cung cấp', 'Khách hàng', 'Cửa hàng', 'Đơn vị'],
  },
  reports: {
    name: 'Báo cáo & Phân tích',
    icon: '📊',
    color: 'bg-[#0099FF]',
    categories: ['Báo cáo'],
  },
  system: {
    name: 'Quản lý hệ thống',
    icon: '⚙️',
    color: 'bg-[#0099FF]',
    categories: ['Thành viên', 'Vai trò', 'Quyền', 'Nhật ký'],
  },
  other: {
    name: 'Khác',
    icon: '🔧',
    color: 'bg-[#0099FF]',
    categories: ['Khác'],
  },
};

// Category order for sorting
const categoryOrder: Record<string, number> = {
  'Nhập kho': 1,
  'Xuất kho': 2,
  'Kiểm kê': 3,
  'Sản phẩm': 4,
  'Danh mục': 5,
  'Nhà cung cấp': 6,
  'Khách hàng': 7,
  'Cửa hàng': 8,
  'Đơn vị': 9,
  'Báo cáo': 10,
  'Thành viên': 11,
  'Vai trò': 12,
  'Quyền': 13,
  'Nhật ký': 14,
  'Khác': 99,
};

interface PermissionWithCategory extends Permission {
  category?: string;
  description?: string;
}

// Function to automatically categorize permission based on permissionCode
function getCategoryFromPermissionCode(permissionCode: string): string {
  const code = permissionCode.toLowerCase();
  
  // Handle dot notation (e.g., "users.view", "products.create")
  if (code.includes('.')) {
    const [module] = code.split('.');
    
    if (module === 'users' || module === 'members' || module === 'user' || module === 'member') return 'Thành viên';
    if (module === 'roles' || module === 'role') return 'Vai trò';
    if (module === 'permissions' || module === 'permission') return 'Quyền';
    if (module === 'products' || module === 'product') return 'Sản phẩm';
    if (module === 'categories' || module === 'category' || module === 'product_categories') return 'Danh mục';
    if (module === 'suppliers' || module === 'supplier') return 'Nhà cung cấp';
    if (module === 'customers' || module === 'customer') return 'Khách hàng';
    if (module === 'stores' || module === 'store') return 'Cửa hàng';
    if (module === 'units' || module === 'unit') return 'Đơn vị';
    if (module === 'reports' || module === 'report') return 'Báo cáo';
    if (module === 'imports' || module === 'import') return 'Nhập kho';
    if (module === 'exports' || module === 'export') return 'Xuất kho';
    if (module === 'inventory_checks' || module === 'inventory_check' || module === 'inventory') return 'Kiểm kê';
    if (module === 'activity_logs' || module === 'activity_log' || module === 'activities') return 'Nhật ký';
  }
  
  // Handle UPPER_SNAKE_CASE format (e.g., "MEMBER_VIEW", "PRODUCT_CREATE")
  const codeUpper = permissionCode.toUpperCase();
  
  // Check in order of specificity (more specific first)
  if (codeUpper.startsWith('INVENTORY_CHECK_')) return 'Kiểm kê';
  if (codeUpper.startsWith('PRODUCT_CATEGORY_')) return 'Danh mục';
  if (codeUpper.startsWith('ACTIVITY_LOG_')) return 'Nhật ký';
  
  // Standard prefixes
  if (codeUpper.startsWith('IMPORT_')) return 'Nhập kho';
  if (codeUpper.startsWith('EXPORT_')) return 'Xuất kho';
  if (codeUpper.startsWith('CATEGORY_')) return 'Danh mục';
  if (codeUpper.startsWith('PRODUCT_')) return 'Sản phẩm';
  if (codeUpper.startsWith('SUPPLIER_')) return 'Nhà cung cấp';
  if (codeUpper.startsWith('CUSTOMER_')) return 'Khách hàng';
  if (codeUpper.startsWith('STORE_')) return 'Cửa hàng';
  if (codeUpper.startsWith('UNIT_')) return 'Đơn vị';
  if (codeUpper.startsWith('REPORT_')) return 'Báo cáo';
  if (codeUpper.startsWith('MEMBER_')) return 'Thành viên';
  if (codeUpper.startsWith('USER_')) return 'Thành viên';
  if (codeUpper.startsWith('ROLE_')) return 'Vai trò';
  if (codeUpper.startsWith('PERMISSION_')) return 'Quyền';
  
  return 'Khác';
}

export default function DieuChinhPhanQuyen() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['warehouse', 'products', 'reports', 'system', 'other']));

  // Fetch roles
  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => getAllRoles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all permissions
  const {
    data: allPermissions = [],
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery<PermissionWithCategory[]>({
    queryKey: ['permissions'],
    queryFn: () => getAllPermissions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId),
    [roles, selectedRoleId]
  );

  // Filter permissions by search query
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return allPermissions;
    const query = searchQuery.toLowerCase();
    return allPermissions.filter(
      (perm) =>
        perm.displayName?.toLowerCase().includes(query) ||
        perm.permissionCode.toLowerCase().includes(query) ||
        perm.description?.toLowerCase().includes(query)
    );
  }, [allPermissions, searchQuery]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, PermissionWithCategory[]> = {};
    filteredPermissions.forEach((perm) => {
      // Use category from permission if available, otherwise auto-detect from permissionCode
      const category = perm.category || getCategoryFromPermissionCode(perm.permissionCode);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(perm);
    });
    return grouped;
  }, [filteredPermissions]);

  // Get all categories sorted by order
  const categories = useMemo(() => {
    return Object.keys(permissionsByCategory).sort((a, b) => {
      const orderA = categoryOrder[a] || 999;
      const orderB = categoryOrder[b] || 999;
      return orderA - orderB;
    });
  }, [permissionsByCategory]);

  // Group categories by sections
  const categoriesBySection = useMemo(() => {
    const grouped: Record<string, { group: typeof categoryGroups[string]; categories: string[] }> = {};
    
    // Get categories to display (filtered by selectedCategory if any)
    const displayCats = selectedCategory ? [selectedCategory] : categories;
    
    Object.entries(categoryGroups).forEach(([key, group]) => {
      const sectionCategories = group.categories.filter((cat) => displayCats.includes(cat));
      if (sectionCategories.length > 0) {
        grouped[key] = {
          group,
          categories: sectionCategories,
        };
      }
    });

    // Add uncategorized categories to "other"
    const allGroupedCategories = new Set(
      Object.values(categoryGroups).flatMap((g) => g.categories)
    );
    const uncategorized = displayCats.filter((cat) => !allGroupedCategories.has(cat));
    if (uncategorized.length > 0 && grouped.other) {
      grouped.other.categories.push(...uncategorized);
    } else if (uncategorized.length > 0) {
      grouped.other = {
        group: categoryGroups.other,
        categories: uncategorized,
      };
    }

    return grouped;
  }, [categories, selectedCategory]);

  // Filter by selected category
  const displayCategories = useMemo(() => {
    if (!selectedCategory) return permissionsByCategory;
    return { [selectedCategory]: permissionsByCategory[selectedCategory] };
  }, [permissionsByCategory, selectedCategory]);

  const handleRoleSelect = useCallback((roleId: number) => {
    setSelectedRoleId(roleId);
    // Update selected permissions when role changes
    const role = roles.find((r) => r.id === roleId);
    if (role?.permissions) {
      setSelectedPermissions(role.permissions.map((p) => p.id));
    } else {
      setSelectedPermissions([]);
    }
  }, [roles]);

  const handlePermissionToggle = useCallback((permissionId: number) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllInCategory = useCallback(
    (category: string) => {
      const categoryPermissions = permissionsByCategory[category] || [];
      const categoryPermissionIds = categoryPermissions.map((p) => p.id);
      const allSelected = categoryPermissionIds.every((id) => selectedPermissions.includes(id));

      setSelectedPermissions((prev) => {
        if (allSelected) {
          // Deselect all in category
          return prev.filter((id) => !categoryPermissionIds.includes(id));
        } else {
          // Select all in category
          const newSet = new Set(prev);
          categoryPermissionIds.forEach((id) => newSet.add(id));
          return Array.from(newSet);
        }
      });
    },
    [permissionsByCategory, selectedPermissions]
  );

  const handleSelectAll = useCallback(() => {
    const allPermissionIds = allPermissions.map((p) => p.id);
    const allSelected = allPermissionIds.every((id) => selectedPermissions.includes(id));

    setSelectedPermissions(allSelected ? [] : allPermissionIds);
  }, [allPermissions, selectedPermissions]);

  const handleToggleSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: (data: { roleId: number; permissionIds: number[] }) =>
      updateRolePermissions(data.roleId, { permissionIds: data.permissionIds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('Cập nhật phân quyền thành công!');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Cập nhật phân quyền thất bại';
      showToast.error(message);
    },
  });

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) {
      showToast.error('Vui lòng chọn vai trò');
      return;
    }

    updatePermissionsMutation.mutate({
      roleId: selectedRoleId,
      permissionIds: selectedPermissions,
    });
  }, [selectedRoleId, selectedPermissions, updatePermissionsMutation]);

  const loading = rolesLoading || permissionsLoading;
  const error = rolesError || permissionsError;

  // Calculate stats
  const totalPermissions = allPermissions.length;
  const selectedCount = selectedPermissions.length;
  const selectedPercentage = totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-gray-900 mb-2">Điều chỉnh phân quyền</h1>
        <p className="text-sm text-blue-gray-600">Quản lý và phân quyền cho các vai trò trong hệ thống</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-blue-800">
            {error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu'}
          </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#0099FF] border-t-transparent mx-auto mb-4"></div>
            <p className="text-sm text-blue-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar - Danh sách vai trò */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl border border-blue-gray-100 sticky top-6">
              <div className="p-5 border-b border-blue-gray-100">
                <h2 className="text-lg font-bold text-blue-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Vai trò ({roles.length})
                </h2>
              </div>
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {roles.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-blue-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-sm text-blue-gray-500">Không có vai trò nào</p>
                  </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg ${
                        selectedRoleId === role.id
                            ? 'bg-[#0099FF] text-white'
                          : 'bg-blue-gray-50 text-blue-gray-700 hover:bg-blue-gray-100'
                      }`}
                    >
                        <div className="font-semibold text-sm">{role.displayName || role.roleCode}</div>
                    </button>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Main Content - Phân quyền */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-blue-gray-100">
            {selectedRole ? (
              <>
                  {/* Header với stats */}
                  <div className="p-6 border-b border-blue-gray-100 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-blue-gray-900 mb-1">
                          Phân quyền cho: <span className="text-gray-900">{selectedRole.displayName || selectedRole.roleCode}</span>
                  </h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-white px-4 py-2 rounded-lg border border-blue-gray-200">
                          <div className="text-xs text-blue-gray-500 mb-1">Đã chọn</div>
                          <div className="text-lg font-bold text-gray-900">
                            {selectedCount} / {totalPermissions}
                          </div>
                          <div className="w-full bg-blue-gray-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-[#0099FF] h-1.5 rounded-full"
                              style={{ width: `${selectedPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Search và Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Tìm kiếm quyền..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSelectAll}
                          className="px-4 py-2.5 text-sm font-medium text-gray-900 bg-white border border-[#0099FF] rounded-lg flex items-center gap-2"
                        >
                          {selectedCount === totalPermissions ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <select
                          value={selectedCategory || ''}
                          onChange={(e) => setSelectedCategory(e.target.value || null)}
                          className="px-4 py-2.5 text-sm border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] bg-white"
                        >
                          <option value="">Tất cả danh mục</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Navigation - Section Tabs */}
                    {!selectedCategory && Object.keys(categoriesBySection).length > 1 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(categoriesBySection).map(([sectionKey, sectionData]) => {
                          const isExpanded = expandedSections.has(sectionKey);
                          return (
                            <button
                              key={sectionKey}
                              onClick={() => handleToggleSection(sectionKey)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-[#0099FF] ${
                                isExpanded 
                                  ? 'bg-[#0099FF] text-white' 
                                  : 'bg-white text-gray-900'
                              }`}
                            >
                              <span>{sectionData.group.icon}</span>
                              <span>{sectionData.group.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isExpanded ? 'bg-white/20 text-white' : 'bg-blue-gray-100 text-gray-900'
                              }`}>
                                {sectionData.categories.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                  )}
                </div>

                  {/* Permissions List */}
                  <div className="p-6 max-h-[calc(100vh-350px)] overflow-y-auto">
                    {Object.keys(displayCategories).length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="mx-auto h-16 w-16 text-blue-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-gray-600">Không tìm thấy quyền nào</p>
                      </div>
                    ) : (
                <div className="space-y-6">
                        {/* Render by sections */}
                        {Object.entries(categoriesBySection).map(([sectionKey, sectionData]) => {
                          const { group, categories: sectionCategories } = sectionData;
                          const sectionPermissions = sectionCategories
                            .filter((cat) => displayCategories[cat])
                            .flatMap((cat) => displayCategories[cat] || []);
                          
                          if (sectionPermissions.length === 0) return null;
                          
                          const isSectionExpanded = expandedSections.has(sectionKey);

                          return (
                            <div key={sectionKey} className="space-y-3">
                              {/* Section Header */}
                              <div className={`border border-[#0099FF] rounded-lg px-5 py-3 cursor-pointer ${
                                isSectionExpanded 
                                  ? 'bg-[#0099FF] text-white' 
                                  : 'bg-white text-gray-900'
                              }`} onClick={() => handleToggleSection(sectionKey)}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">{group.icon}</span>
                                    <div>
                                      <h3 className="font-bold text-lg">{group.name}</h3>
                                      <p className={`text-xs ${
                                        isSectionExpanded ? 'text-white/80' : 'text-gray-600'
                                      }`}>
                                        {sectionCategories.length} danh mục • {sectionPermissions.length} quyền
                                      </p>
                                    </div>
                                  </div>
                                  <svg
                                    className={`w-6 h-6 ${isSectionExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>

                              {/* Categories in this section */}
                              {isSectionExpanded && (
                                <div className="space-y-3 pl-2">
                                  {sectionCategories
                                    .filter((cat) => displayCategories[cat])
                                    .map((category) => {
                                    const permissions = displayCategories[category] || [];
                                    const categorySelected = permissions.filter((p) => selectedPermissions.includes(p.id));
                                    const allSelected = permissions.length > 0 && categorySelected.length === permissions.length;
                                    const isExpanded = expandedCategories.has(category);

                                    return (
                                      <div key={category} className="border border-blue-gray-200 rounded-lg overflow-hidden bg-white">
                                        {/* Category Header */}
                                        <div className="bg-white px-4 py-3 border-b border-blue-gray-200">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                              <button
                                                onClick={() => handleToggleCategory(category)}
                                                className="flex items-center gap-2 text-gray-900"
                                              >
                                                <svg
                                                  className={`w-5 h-5 ${isExpanded ? 'rotate-90' : ''}`}
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                <span className="text-xl">{categoryIcons[category] || '📋'}</span>
                                                <span className="font-semibold text-sm">{category}</span>
                                                <span className="text-xs text-blue-gray-500 bg-blue-gray-100 px-2 py-0.5 rounded-full">
                                                  {permissions.length}
                                                </span>
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-blue-gray-600">
                                                {categorySelected.length}/{permissions.length} đã chọn
                                              </span>
                                              <button
                                                onClick={() => handleSelectAllInCategory(category)}
                                                className="px-3 py-1 text-xs font-medium rounded-md bg-white border border-[#0099FF] text-gray-900 flex items-center gap-1"
                                              >
                                                {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Permissions List */}
                                        {isExpanded && (
                                          <div className="p-3 space-y-2 bg-white">
                                            {permissions.map((permission) => {
                                              const isSelected = selectedPermissions.includes(permission.id);
                                              return (
                          <label
                            key={permission.id}
                                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                                                    isSelected
                                                      ? 'bg-blue-50 border-[#0099FF]'
                                                      : 'border-blue-gray-200 hover:bg-blue-gray-50 hover:border-blue-gray-300'
                                                  }`}
                          >
                            <input
                              type="checkbox"
                                                    checked={isSelected}
                              onChange={() => handlePermissionToggle(permission.id)}
                                                    className="mt-1 w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 cursor-pointer"
                            />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900">
                                {permission.displayName || permission.permissionCode}
                              </div>
                              {permission.description && (
                                                      <div className="text-xs text-blue-gray-500 mt-1 line-clamp-2">
                                  {permission.description}
                                                      </div>
                                                    )}
                                                    <div className="text-xs text-blue-gray-400 mt-1 font-mono">
                                                      {permission.permissionCode}
                                                    </div>
                                                  </div>
                                                  {isSelected && (
                                                    <svg className="w-5 h-5 text-gray-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                </label>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>

                  {/* Footer Actions - Sticky */}
                  <div className="sticky bottom-0 bg-white border-t border-blue-gray-100 px-6 py-4 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-gray-600">
                        <span className="font-medium text-gray-900">{selectedCount}</span> quyền đã được chọn
                        {selectedCount > 0 && (
                          <span className="ml-2 text-blue-gray-500">
                            ({selectedPercentage}% tổng số quyền)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleId(null);
                      setSelectedPermissions([]);
                            setSearchQuery('');
                            setSelectedCategory(null);
                    }}
                          className="px-6 py-2.5 border border-[#0099FF] rounded-lg text-gray-900 bg-white font-medium flex items-center gap-2"
                  >
                    Hủy
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                          disabled={updatePermissionsMutation.isPending || selectedCount === 0}
                          className="px-6 py-2.5 bg-white border border-[#0099FF] text-gray-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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
                            <>
                              Lưu phân quyền
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </>
                    )}
                  </button>
                      </div>
                    </div>
                </div>
              </>
            ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-gray-100 rounded-full mb-4">
                    <svg className="w-10 h-10 text-blue-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-gray-900 mb-2">Chưa chọn vai trò</h3>
                  <p className="text-sm text-blue-gray-600 max-w-sm mx-auto">
                    Vui lòng chọn một vai trò từ danh sách bên trái để bắt đầu điều chỉnh phân quyền
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}

