// src/hooks/useRoutePermission.ts
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canAccessRoute } from '@/lib/route-permissions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getProfile, type UserProfile } from '@/services/auth.service';

/**
 * Hook để kiểm tra quyền truy cập route và lấy user profile
 */
export function useRoutePermission() {
  const pathname = usePathname();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        // 1. Lấy profile từ sessionStorage (đã được Sidebar cache)
        let profile: UserProfile | null = null;
        if (typeof window !== 'undefined') {
          try {
            const cached = window.sessionStorage.getItem('userProfile');
            if (cached) {
              profile = JSON.parse(cached) as UserProfile;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to parse cached profile:', e);
            }
          }
        }

        // 2. Nếu không có cache, fetch từ API
        if (!profile) {
          try {
            profile = await getProfile();
            // Cache lại
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('userProfile', JSON.stringify(profile));
            }
          } catch (err) {
            if (mounted) {
              // Nếu không lấy được profile, có thể token hết hạn
              router.replace('/login');
              return;
            }
          }
        }

        if (!mounted || !profile) return;

        setUserProfile(profile);

        // 3. Lấy roles và tính toán permissions từ roles
        const userRoles = profile.roles || [];
        
        // Tính toán permissions từ roles (dùng logic từ permissions.ts)
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
          // Redirect về dashboard hoặc trang 403
          router.replace('/dashboard');
        }
      } catch (err) {
        if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error checking route permission:', err);
          }
          // Nếu có lỗi, redirect về login
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

  return {
    userProfile,
    loading,
    hasAccess,
    userRoles: userProfile?.roles || [],
  };
}

