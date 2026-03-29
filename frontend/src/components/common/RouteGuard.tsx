// src/components/common/RouteGuard.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { canAccessRoute } from '@/lib/route-permissions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getProfile, type UserProfile } from '@/services/auth.service';

interface RouteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component để bảo vệ route - chặn truy cập nếu không có quyền
 */
export default function RouteGuard({ children, fallback }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        // 1. Lấy profile từ sessionStorage hoặc API
        let profile: UserProfile | null = null;
        if (typeof window !== 'undefined') {
          try {
            const cached = window.sessionStorage.getItem('userProfile');
            if (cached) {
              profile = JSON.parse(cached) as UserProfile;
            }
          } catch (e) {
            // Ignore parse error
          }
        }

        // 2. Nếu không có cache, fetch từ API
        if (!profile) {
          try {
            profile = await getProfile();
            if (typeof window !== 'undefined' && profile) {
              window.sessionStorage.setItem('userProfile', JSON.stringify(profile));
            }
          } catch (err) {
            if (mounted) {
              // Token hết hạn hoặc không hợp lệ
              router.replace('/login');
              return;
            }
          }
        }

        if (!mounted || !profile) return;

        setUserProfile(profile);

        // 3. Tính toán permissions từ roles
        const userRoles = profile.roles || [];
        const userPermissions: string[] = [];
        const allPermissions = Object.values(PERMISSIONS);
        for (const permission of allPermissions) {
          if (hasPermission(userRoles, permission)) {
            userPermissions.push(permission);
          }
        }

        // 4. Kiểm tra quyền truy cập
        const access = canAccessRoute(pathname, userRoles, userPermissions);
        setHasAccess(access);

        // 5. Nếu không có quyền, redirect
        if (!access) {
          router.replace('/dashboard');
        }
      } catch (err) {
        if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error in RouteGuard:', err);
          }
          router.replace('/login');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // Loading state
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 mx-auto text-[#0099FF] mb-4"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
          </div>
        </div>
      )
    );
  }

  // Không có quyền - sẽ redirect, nhưng hiển thị message trong lúc chờ
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-600 mb-4">
            Bạn không có quyền truy cập trang này. Đang chuyển hướng...
          </p>
        </div>
      </div>
    );
  }

  // Có quyền - render children
  return <>{children}</>;
}

