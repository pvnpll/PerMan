'use client';

import { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Download, Trash2, Key, Bell, Globe, User, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [fullName, setFullName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // MCP Tokens
  const [newToken, setNewToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setFullName(data.user.user_metadata?.full_name || '');
        setNotificationEmail(data.user.email || '');
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(false);

    try {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          timezone,
        },
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ChatGPT Custom GPT Token' }),
      });
      const data = await res.json();
      if (data.token) {
        setNewToken(data.token);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAllData = async () => {
    const confirmation = prompt(
      'Type "DELETE" to clear all your PerMang tasks, categories, projects, and reminders.\n(Your Supabase account and other apps remain untouched).'
    );
    if (confirmation !== 'DELETE') return;

    try {
      await fetch('/api/account', { method: 'DELETE' });
      alert('PerMang data cleared successfully.');
      window.location.reload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Integrations</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your personal workspace, notifications, data export, and ChatGPT MCP connectivity.
        </p>
      </div>

      {/* Profile & Timezone */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <User className="w-4 h-4 text-indigo-400" />
          <span>Profile & Timezone</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Timezone (IANA)
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedMessage && (
              <span className="text-xs text-emerald-400 font-medium">✓ Profile updated</span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ChatGPT MCP Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ChatGPT MCP Integration</span>
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            Active
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Connect PerMang to ChatGPT Custom GPTs or Claude. Use natural language in ChatGPT to create tasks, search your history, check daily summaries, and schedule reminders.
        </p>

        {/* MCP Configuration Details */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
          <div>
            <div className="text-slate-500 font-medium mb-1">MCP Endpoint (Streamable HTTP / SSE)</div>
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-slate-300">
              <span className="truncate">{appUrl}/api/mcp</span>
              <button
                onClick={() => copyToClipboard(`${appUrl}/api/mcp`)}
                className="text-indigo-400 hover:text-white ml-2 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-slate-500 font-medium mb-1">OAuth Authorization Endpoint</div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-slate-300 truncate">
              {appUrl}/mcp/authorize
            </div>
          </div>

          <div>
            <div className="text-slate-500 font-medium mb-1">OAuth Token Endpoint</div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-slate-300 truncate">
              {appUrl}/api/mcp/token
            </div>
          </div>
        </div>

        {/* Personal Access Token generator */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Direct Personal Access Token (PAT)</span>
            <button
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              {generatingToken ? 'Generating...' : 'Generate New Token'}
            </button>
          </div>

          {newToken && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="text-amber-300 font-semibold">Copy this token now (it won't be shown again):</div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg font-mono text-white text-[11px] break-all">
                <span>{newToken}</span>
                <button
                  onClick={() => copyToClipboard(newToken)}
                  className="text-amber-400 hover:text-white ml-2 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Export & Account Safety */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Data Export & Privacy</span>
        </h3>

        <p className="text-xs text-slate-400">
          Export your entire PerMang database (all tasks, categories, projects, reminders, and delivery logs) as JSON anytime.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/api/export"
            download
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export All Tasks as JSON</span>
          </a>

          <button
            onClick={handleDeleteAllData}
            className="py-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs font-semibold flex items-center space-x-2 border border-red-800/80 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Clear PerMang Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
