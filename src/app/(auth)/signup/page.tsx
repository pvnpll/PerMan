'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.push('/');
      router.refresh();
    } else {
      setMessage('Account created! Please check your email to verify your account or proceed to log in.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] flex flex-col justify-center items-center p-4 text-zinc-100">
      <div className="memory-panel w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-zinc-200 items-center justify-center font-semibold text-xl text-zinc-900 mb-4">
            PM
          </div>
          <h1 className="memory-title">Create PerMan Account</h1>
          <p className="memory-subtitle text-center">Initialize your personal task & memory space</p>
        </div>

        {error && (
          <div className="memory-panel flex items-center space-x-2 p-3 text-zinc-200 text-sm mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="memory-panel p-4 text-zinc-200 text-sm mb-6">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pavan"
                className="memory-input w-full py-2.5 pl-10 pr-4 text-sm transition"
              />
            </div>
          </div>

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
                minLength={6}
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
                <span>Sign Up & Initialize</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-white/[.07]">
          <p className="text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-300 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
