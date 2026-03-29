// src/lib/auth.ts

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function saveToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// tiện nếu sau này muốn check nhanh
export function isLoggedIn(): boolean {
  return !!getToken();
}

export function saveRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Decode JWT token without verification (client-side only)
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJWT(token: string): { [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode base64url payload (second part)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    // Decode
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) {
    return true;
  }
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true; // Invalid token or no expiration
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  
  // Add 5 second buffer to account for clock skew
  return currentTime >= (expirationTime - 5000);
}

/**
 * Get token expiration time
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiration(token: string | null): number | null {
  if (!token) {
    return null;
  }
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  return decoded.exp * 1000; // Convert to milliseconds
}

/**
 * Get remaining time until token expires
 * @param token - JWT token string
 * @returns Remaining milliseconds, or 0 if expired/invalid
 */
export function getTokenRemainingTime(token: string | null): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 0;
  }
  
  const remaining = expiration - Date.now();
  return remaining > 0 ? remaining : 0;
}
