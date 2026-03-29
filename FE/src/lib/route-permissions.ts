// src/lib/route-permissions.ts
// Route permission mapping - định nghĩa route nào cần role/permission nào

import { PERMISSIONS } from './permissions';

export type RoutePermission = {
  // Roles được phép truy cập (OR logic - chỉ cần 1 role)
  allowedRoles?: string[];
  // Permissions được phép truy cập (OR logic - chỉ cần 1 permission)
  allowedPermissions?: string[];
  // Nếu true, chỉ cần có 1 trong allowedRoles HOẶC 1 trong allowedPermissions
  // Nếu false, cần có 1 trong allowedRoles VÀ 1 trong allowedPermissions
  requireBoth?: boolean;
};

// Mapping route patterns -> permissions
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Dashboard - tất cả user đã đăng nhập đều xem được
  '/dashboard': {
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF', 'USER'],
  },

  // Profile - tất cả user đã đăng nhập đều xem được
  '/profile': {
    allowedRoles: ['ADMIN', 'MANAGER', 'STAFF', 'USER'],
  },

  // Imports
  '/imports': {
    allowedPermissions: [PERMISSIONS.IMPORT_VIEW],
  },
  '/imports/create': {
    allowedPermissions: [PERMISSIONS.IMPORT_CREATE],
  },
  '/imports/view': {
    allowedPermissions: [PERMISSIONS.IMPORT_VIEW],
  },
  '/imports/edit': {
    allowedPermissions: [PERMISSIONS.IMPORT_EDIT],
  },

  // Exports
  '/exports': {
    allowedPermissions: [PERMISSIONS.EXPORT_VIEW],
  },
  '/exports/create': {
    allowedPermissions: [PERMISSIONS.EXPORT_CREATE],
  },
  '/exports/view': {
    allowedPermissions: [PERMISSIONS.EXPORT_VIEW],
  },
  '/exports/edit': {
    allowedPermissions: [PERMISSIONS.EXPORT_EDIT],
  },

  // Inventory Checks
  '/inventory/inventory-checks': {
    allowedPermissions: [PERMISSIONS.INVENTORY_CHECK_VIEW],
  },
  '/inventory/create-inventory-check': {
    allowedPermissions: [PERMISSIONS.INVENTORY_CHECK_CREATE],
  },
  '/inventory/view-inventory-check': {
    allowedPermissions: [PERMISSIONS.INVENTORY_CHECK_VIEW],
  },
  '/inventory/edit-inventory-check': {
    allowedPermissions: [PERMISSIONS.INVENTORY_CHECK_EDIT],
  },

  // Products - dùng permissions
  '/products': {
    allowedPermissions: [PERMISSIONS.PRODUCT_VIEW],
  },
  '/products/create': {
    allowedPermissions: [PERMISSIONS.PRODUCT_CREATE],
  },
  '/products/detail': {
    allowedPermissions: [PERMISSIONS.PRODUCT_VIEW],
  },
  '/products/edit': {
    allowedPermissions: [PERMISSIONS.PRODUCT_EDIT],
  },

  // Categories - Suppliers
  '/categories/suppliers': {
    allowedPermissions: [PERMISSIONS.SUPPLIER_VIEW],
  },
  '/categories/suppliers/create': {
    allowedPermissions: [PERMISSIONS.SUPPLIER_CREATE],
  },
  '/categories/suppliers/edit': {
    allowedPermissions: [PERMISSIONS.SUPPLIER_EDIT],
  },
  '/categories/suppliers/detail': {
    allowedPermissions: [PERMISSIONS.SUPPLIER_VIEW],
  },

  // Categories - Customers
  '/categories/customers': {
    allowedPermissions: [PERMISSIONS.CUSTOMER_VIEW],
  },
  '/categories/customers/create': {
    allowedPermissions: [PERMISSIONS.CUSTOMER_CREATE],
  },
  '/categories/customers/edit': {
    allowedPermissions: [PERMISSIONS.CUSTOMER_EDIT],
  },
  '/categories/customers/detail': {
    allowedPermissions: [PERMISSIONS.CUSTOMER_VIEW],
  },

  // Categories - Product Categories
  '/categories/product-categories': {
    allowedPermissions: [PERMISSIONS.CATEGORY_VIEW],
  },
  '/categories/product-categories/create': {
    allowedPermissions: [PERMISSIONS.CATEGORY_CREATE],
  },
  '/categories/product-categories/edit': {
    allowedPermissions: [PERMISSIONS.CATEGORY_EDIT],
  },

  // Categories - Units
  '/categories/units': {
    allowedPermissions: [PERMISSIONS.UNIT_VIEW],
  },
  '/categories/units/create': {
    allowedPermissions: [PERMISSIONS.UNIT_CREATE],
  },
  '/categories/units/edit': {
    allowedPermissions: [PERMISSIONS.UNIT_EDIT],
  },

  // Categories - Stores
  '/categories/stores': {
    allowedPermissions: [PERMISSIONS.STORE_VIEW],
  },
  '/categories/stores/create': {
    allowedPermissions: [PERMISSIONS.STORE_CREATE],
  },
  '/categories/stores/edit': {
    allowedPermissions: [PERMISSIONS.STORE_EDIT],
  },
  '/categories/stores/view': {
    allowedPermissions: [PERMISSIONS.STORE_VIEW],
  },

  // Reports
  '/reports': {
    allowedPermissions: [PERMISSIONS.REPORT_VIEW],
  },
  '/reports/inventory-report': {
    allowedPermissions: [PERMISSIONS.REPORT_VIEW],
  },
  '/reports/import-report': {
    allowedPermissions: [PERMISSIONS.REPORT_VIEW],
  },
  '/reports/export-report': {
    allowedPermissions: [PERMISSIONS.REPORT_VIEW],
  },
  '/reports/demand-forecast': {
    allowedPermissions: [PERMISSIONS.REPORT_VIEW],
  },

  // Members - chỉ ADMIN
  '/members': {
    allowedPermissions: [PERMISSIONS.MEMBER_VIEW],
  },
  '/members/create': {
    allowedPermissions: [PERMISSIONS.MEMBER_CREATE],
  },
  '/members/edit': {
    allowedPermissions: [PERMISSIONS.MEMBER_EDIT],
  },
  '/members/detail': {
    allowedPermissions: [PERMISSIONS.MEMBER_VIEW],
  },

  // Roles - chỉ ADMIN
  '/members/roles': {
    allowedPermissions: [PERMISSIONS.ROLE_VIEW],
  },
  '/members/roles/create': {
    allowedPermissions: [PERMISSIONS.ROLE_CREATE],
  },
  '/members/roles/edit': {
    allowedPermissions: [PERMISSIONS.ROLE_EDIT],
  },
  '/members/roles/detail': {
    allowedPermissions: [PERMISSIONS.ROLE_VIEW],
  },

  // Permissions - chỉ ADMIN
  '/members/permissions': {
    allowedPermissions: [PERMISSIONS.PERMISSION_VIEW],
  },
  '/members/permissions-management': {
    allowedPermissions: [PERMISSIONS.PERMISSION_VIEW],
  },
  '/members/permissions-management/create': {
    allowedPermissions: [PERMISSIONS.PERMISSION_CREATE],
  },
  '/members/permissions-management/edit': {
    allowedPermissions: [PERMISSIONS.PERMISSION_EDIT],
  },
  '/members/permissions-management/detail': {
    allowedPermissions: [PERMISSIONS.PERMISSION_VIEW],
  },

  // Activity Logs - chỉ ADMIN
  '/members/activity-logs': {
    allowedPermissions: [PERMISSIONS.ACTIVITY_LOG_VIEW],
  },
};

/**
 * Tìm permission config cho một route
 * Hỗ trợ pattern matching với dynamic segments
 */
export function getRoutePermission(pathname: string): RoutePermission | null {
  // Normalize pathname
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

  // 1. Kiểm tra exact match trước
  if (ROUTE_PERMISSIONS[normalized]) {
    return ROUTE_PERMISSIONS[normalized];
  }

  // 2. Kiểm tra pattern matching với dynamic segments
  // Ví dụ: /products/edit/123 -> match với /products/edit
  for (const [pattern, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    // Nếu pattern kết thúc bằng segment (không có trailing slash)
    // và pathname bắt đầu bằng pattern + /
    if (normalized.startsWith(pattern + '/')) {
      return permission;
    }
  }

  // 3. Fallback: nếu không tìm thấy, mặc định cho phép (để tránh block các route mới)
  // Nhưng tốt hơn là return null để bắt buộc phải định nghĩa
  return null;
}

/**
 * Kiểm tra xem user có quyền truy cập route không
 */
export function canAccessRoute(
  pathname: string,
  userRoles: string[],
  userPermissions: string[] = []
): boolean {
  const routePermission = getRoutePermission(pathname);

  // Nếu không có config, mặc định cho phép (để tránh block các route mới)
  // Nhưng có thể thay đổi thành false nếu muốn strict hơn
  if (!routePermission) {
    return true; // Hoặc false nếu muốn strict
  }

  const { allowedRoles, allowedPermissions, requireBoth = false } = routePermission;

  // Nếu không có yêu cầu gì, cho phép
  if (!allowedRoles && !allowedPermissions) {
    return true;
  }

  // Kiểm tra roles
  const hasRole = allowedRoles
    ? allowedRoles.some((role) => userRoles.map((r) => r.toUpperCase()).includes(role.toUpperCase()))
    : false;

  // Kiểm tra permissions
  const hasPermission = allowedPermissions
    ? allowedPermissions.some((perm) => userPermissions.includes(perm))
    : false;

  // Logic: requireBoth = false: chỉ cần 1 trong 2 (OR)
  // requireBoth = true: cần cả 2 (AND)
  if (requireBoth) {
    return hasRole && hasPermission;
  } else {
    // Nếu chỉ có allowedRoles, chỉ cần role
    if (allowedRoles && !allowedPermissions) {
      return hasRole;
    }
    // Nếu chỉ có allowedPermissions, chỉ cần permission
    if (allowedPermissions && !allowedRoles) {
      return hasPermission;
    }
    // Nếu có cả 2, chỉ cần 1 trong 2
    return hasRole || hasPermission;
  }
}

