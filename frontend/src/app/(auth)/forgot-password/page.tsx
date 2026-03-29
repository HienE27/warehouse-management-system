'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await forgotPassword(email.trim());
      if (!res.success) {
        setError(res.message || 'Không thể gửi yêu cầu');
        return;
      }
      setSuccess(
        res.message ||
          'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

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
                Khôi phục tài khoản
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Quên mật khẩu
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                {success}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-600">
                  Email
                </label>
                <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 shadow-inner focus-within:border-sky-400 focus-within:bg-white focus-within:shadow-sky-50">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Nhập email"
                    className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link className="text-sky-600 hover:underline" href="/login">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


