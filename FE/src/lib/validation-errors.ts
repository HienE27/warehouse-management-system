// src/lib/validation-errors.ts

export interface ValidationErrors {
  [field: string]: string;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: ValidationErrors | string | unknown;
}

/**
 * Parse validation errors from API response
 * @param errorData - The error data from API response
 * @returns Object with field-level errors or null if not validation errors
 */
export function parseValidationErrors(
  errorData: unknown
): ValidationErrors | null {
  if (!errorData || typeof errorData !== 'object') {
    return null;
  }

  const response = errorData as ApiErrorResponse;

  // Check if data contains validation errors (Map<String, String>)
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    const data = response.data as Record<string, unknown>;
    // Check if it looks like validation errors (all values are strings)
    const allValuesAreStrings = Object.values(data).every(
      (value) => typeof value === 'string'
    );
    if (allValuesAreStrings) {
      return data as ValidationErrors;
    }
  }

  return null;
}

/**
 * Format validation errors into user-friendly messages
 * @param errors - Validation errors object
 * @returns Formatted error message string
 */
export function formatValidationErrors(errors: ValidationErrors): string {
  const messages = Object.entries(errors).map(([field, message]) => {
    // Convert field names to Vietnamese if needed
    const fieldName = getFieldDisplayName(field);
    return `${fieldName}: ${message}`;
  });

  return messages.join('\n');
}

/**
 * Get display name for field (Vietnamese)
 */
function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    oldPassword: 'Mật khẩu cũ',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu',
    email: 'Email',
    phone: 'Số điện thoại',
    firstName: 'Họ',
    lastName: 'Tên',
    address: 'Địa chỉ',
    roleCode: 'Mã vai trò',
    permissionCode: 'Mã quyền',
    displayName: 'Tên hiển thị',
  };

  return fieldNames[field] || field;
}

/**
 * Get first validation error message
 * @param errors - Validation errors object
 * @returns First error message or null
 */
export function getFirstValidationError(
  errors: ValidationErrors
): string | null {
  const firstError = Object.values(errors)[0];
  return firstError || null;
}

