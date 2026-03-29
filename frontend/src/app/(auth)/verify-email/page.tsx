'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/services/auth.service';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!token) {
        setError('Thiếu token xác thực email.');
        setLoading(false);
        return;
      }

      try {
        const res = await verifyEmail(token);
        if (!res.success) {
          setError(res.message || 'Xác thực email thất bại');
          return;
        }
        setSuccess(res.message || 'Xác thực email thành công.');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl">
          <div className="bg-white p-8 text-slate-900 sm:p-12">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Bảo mật tài khoản
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Xác thực email
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Đang kiểm tra thông tin xác thực…
              </p>
            </div>

            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Đang xử lý...
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}

            {!loading && success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                {success}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link className="text-sky-600 hover:underline" href="/login">
                Về trang đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


