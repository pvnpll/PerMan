'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <div className="memory-panel w-full max-w-md p-8">
      <div className="text-center mb-8">
        <div className="inline-flex w-12 h-12 rounded-xl bg-zinc-200 items-center justify-center font-semibold text-xl text-zinc-900 mb-4">
          PM
        </div>
        <h1 className="memory-title">Sign in to PerMan</h1>
        <p className="memory-subtitle text-center">Your personal external memory</p>
      </div>

      {error && (
        <div className="memory-panel flex items-center space-x-2 p-3 text-zinc-200 text-sm mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="memory-input w-full py-2.5 pl-10 pr-4 text-sm transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="memory-input w-full py-2.5 pl-10 pr-4 text-sm transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="memory-btn-primary w-full mt-2 py-3 px-4 text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-white/[.07]">
        <p className="text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-zinc-300 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0c0e12] flex flex-col justify-center items-center p-4 text-zinc-100">
      <Suspense fallback={<div className="text-zinc-400 text-sm">Loading sign-in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
