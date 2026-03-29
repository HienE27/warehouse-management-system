// src/lib/api-client.ts
import { API_BASE_URL } from '@/config/api';
import { parseValidationErrors, formatValidationErrors, type ValidationErrors } from './validation-errors';
import { getToken, isTokenExpired, clearToken, getRefreshToken, saveToken, saveRefreshToken } from './auth';

export interface ApiFetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ApiError extends Error {
  public validationErrors?: ValidationErrors;

  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    
    // Parse validation errors if available
    if (data) {
      const validationErrors = parseValidationErrors(data);
      if (validationErrors) {
        this.validationErrors = validationErrors;
        // Update message to include validation errors
        this.message = formatValidationErrors(validationErrors);
      }
    }
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Exponential backoff retry delay
function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, attempt);
}

// Create timeout promise
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    retries = 0,
    retryDelay = 1000,
    timeout = 30000, // 30 seconds default
    ...fetchOptions
  } = options;

  // Dùng helper để thống nhất nơi lưu token
  let token = getToken();

  const isAuthEndpoint =
    url.startsWith('/api/auth/login') ||
    url.startsWith('/api/auth/refresh') ||
    url.startsWith('/api/auth/forgot-password') ||
    url.startsWith('/api/auth/reset-password') ||
    url.startsWith('/api/auth/verify-email') ||
    url.startsWith('/api/auth/resend-verification');

  // Shared refresh-in-flight to avoid stampede
  const refreshTokenOnce = async (): Promise<{ token: string; refreshToken: string } | null> => {
    const rt = getRefreshToken();
    if (!rt) return null;

    // module-scope promise
    type AuthRefreshPromise = Promise<{ token: string; refreshToken: string } | null>;
    interface GlobalWithAuthPromise {
      __auth_refresh_promise?: AuthRefreshPromise;
    }
    const global = globalThis as unknown as GlobalWithAuthPromise;
    if (global.__auth_refresh_promise) {
      return global.__auth_refresh_promise;
    }

    const p = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          success?: boolean;
          data?: { token?: string; refreshToken?: string };
        };
        const newToken = data?.data?.token;
        const newRefreshToken = data?.data?.refreshToken;
        if (!newToken || !newRefreshToken) return null;

        saveToken(newToken);
        saveRefreshToken(newRefreshToken);
        return { token: newToken, refreshToken: newRefreshToken };
      } catch {
        return null;
      } finally {
        global.__auth_refresh_promise = undefined;
      }
    })();

    global.__auth_refresh_promise = p;
    return p;
  };

  // Check token expiration before making request
  if (token && isTokenExpired(token) && !isAuthEndpoint) {
    // Attempt refresh once if we have refresh token
    const refreshed = await refreshTokenOnce();
    if (refreshed?.token) {
      token = refreshed.token;
    } else {
      // Token expired, clear it and redirect to login
      if (typeof window !== 'undefined') {
        clearToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new ApiError(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        401,
        'Unauthorized'
      );
    }
  }

  const isFormData = fetchOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  // ❗ Chỉ set JSON khi KHÔNG phải FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;
  let didRefreshForThisRequest = false;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create fetch with timeout
      const fetchPromise = fetch(`${API_BASE_URL}${url}`, {
        ...fetchOptions,
        headers,
      });

      const res = await Promise.race([
        fetchPromise,
        createTimeoutPromise(timeout),
      ]);

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        let errorData: unknown;

        try {
          const data = (await res.json()) as { message?: string; error?: string; data?: unknown };
          errorData = data;
          
          // Check for validation errors first
          const validationErrors = parseValidationErrors(data);
          if (validationErrors) {
            errorMessage = formatValidationErrors(validationErrors);
          } else if (data?.message) {
            errorMessage = data.message;
          } else if (data?.error) {
            errorMessage = data.error;
          }
        } catch {
          // If response is not JSON, try to get text
          try {
            const text = await res.text();
            if (text) errorMessage = text;
          } catch {
            // Ignore
          }
        }

        // 401: try refresh once (except auth endpoints), then retry original request
        if (res.status === 401 && !didRefreshForThisRequest && !isAuthEndpoint) {
          didRefreshForThisRequest = true;
          const refreshed = await refreshTokenOnce();
          if (refreshed?.token) {
            headers['Authorization'] = `Bearer ${refreshed.token}`;
            // retry without consuming retries budget
            attempt--;
            continue;
          }
        }

        // Với 401/403: nếu không refresh được (hoặc forbidden) -> clear & redirect
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            clearToken();
            if (window.location.pathname !== '/login') {
              setTimeout(() => {
                window.location.href = '/login';
              }, 100);
            }
          }
          throw new ApiError(
            res.status === 401
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
              : (errorMessage || 'Bạn không có quyền thực hiện thao tác này.'),
            res.status,
            res.statusText,
            errorData
          );
        }

        // Với 500: không redirect, chỉ throw error
        if (res.status >= 500) {
          throw new ApiError(
            errorMessage || 'Lỗi server. Vui lòng thử lại sau.',
            res.status,
            res.statusText,
            errorData
          );
        }

        // Với 5xx errors: retry nếu còn attempts
        if (res.status >= 500 && attempt < retries) {
          const delay = getRetryDelay(attempt, retryDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new ApiError(errorMessage, res.status, res.statusText, errorData);
      }

      // nếu là 204 thì không có body
      if (res.status === 204) {
        return undefined as T;
      }

      return (await res.json()) as T;
    } catch (error) {
      lastError = error as Error;

      // Timeout errors: retry nếu còn attempts
      if (error instanceof TimeoutError && attempt < retries) {
        const delay = getRetryDelay(attempt, retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Network errors: retry nếu còn attempts
      if (
        (error instanceof TypeError || error instanceof DOMException) &&
        attempt < retries
      ) {
        const delay = getRetryDelay(attempt, retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Nếu là ApiError (401, 403, etc.) hoặc hết retries, throw ngay
      throw error;
    }
  }

  // Nếu đến đây nghĩa là đã hết retries
  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new NetworkError(
    'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
    lastError
  );
}