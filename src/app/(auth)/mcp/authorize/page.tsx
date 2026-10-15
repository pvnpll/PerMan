'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = searchParams.get('client_id') || 'ChatGPT';
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!redirectUri) {
      setError('Missing redirect_uri parameter');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mcp/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authorization failed');
      }

      // Redirect back to ChatGPT / Claude
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (redirectUri) {
      const cancelUrl = new URL(redirectUri);
      cancelUrl.searchParams.set('error', 'access_denied');
      if (state) cancelUrl.searchParams.set('state', state);
      window.location.href = cancelUrl.toString();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white">
            PM
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">PerMan</h1>
            <p className="text-xs text-slate-400">Personal Management & External Memory</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5 mb-5">
          <div className="flex items-center space-x-2 text-indigo-400 font-medium text-sm mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span>Connect Application</span>
          </div>
          <p className="text-sm text-slate-300">
            <strong className="text-white">{clientId}</strong> is requesting permission to access your PerMan workspace.
          </p>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-6 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Permissions Requested:
          </div>
          <div className="flex items-start space-x-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Create, search, and manage your personal tasks</span>
          </div>
          <div className="flex items-start space-x-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Schedule reminders and view daily summaries</span>
          </div>
          <div className="flex items-start space-x-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Organize tasks by categories and projects</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-200 text-sm mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700/80 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? (
              <span>Authorizing...</span>
            ) : (
              <>
                <span>Authorize</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function McpAuthorizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading authorization...</div>}>
      <AuthorizeContent />
    </Suspense>
  );
}
