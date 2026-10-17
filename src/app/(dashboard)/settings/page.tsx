'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ShieldCheck, Download, Trash2, Key, Bell, Globe, User, Check, Copy, ExternalLink, Loader2, LogOut } from 'lucide-react';
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeleteAllData = async () => {
    const confirmation = prompt(
      'Type "DELETE" to clear all your PerMan tasks, categories, projects, and reminders.\n(Your Supabase account and other apps remain untouched).'
    );
    if (confirmation !== 'DELETE') return;

    try {
      await fetch('/api/account', { method: 'DELETE' });
      alert('PerMan data cleared successfully.');
      window.location.reload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="memory-home space-y-8 max-w-4xl">
      <div>
        <p className="memory-eyebrow">Configuration</p>
        <h1 className="memory-title mt-3">Settings & Integrations</h1>
        <p className="memory-subtitle">
          Manage your personal workspace, notifications, data export, and ChatGPT MCP connectivity.
        </p>
      </div>

      {/* Account & Session Section (Prominent Mobile & Desktop Sign Out) */}
      <div className="memory-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-100 flex items-center space-x-2">
            <User className="w-4 h-4 text-zinc-300" />
            <span>Account & Authentication</span>
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md memory-chip text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
            Active Session
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div>
            <div className="text-sm text-zinc-100 font-semibold truncate">
              {notificationEmail || 'Active User'}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Authenticated with Supabase · Isolated strictly to PerMan (<code className="text-zinc-400">pm_</code>) data
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Profile & Timezone */}
      <div className="memory-panel p-6">
        <h3 className="text-sm font-medium text-zinc-100 mb-4 flex items-center space-x-2">
          <Globe className="w-4 h-4 text-zinc-300" />
          <span>Profile & Timezone</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/25"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Timezone (IANA)
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata"
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedMessage && (
              <span className="text-xs text-zinc-400 font-medium">✓ Profile updated</span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold shadow-none transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ChatGPT MCP Integration */}
      <div className="bg-[#111318] border border-white/[.07] rounded-xl p-6 shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>ChatGPT MCP Integration</span>
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md memory-chip text-zinc-400 bg-white/[.03]">
            Active
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          Connect PerMan to ChatGPT Custom GPTs or Claude. Use natural language in ChatGPT to create tasks, search your history, check daily summaries, and schedule reminders.
        </p>

        {/* MCP Configuration Details */}
        <div className="bg-[#0c0e12] rounded-xl p-4 border border-white/[.07] space-y-3 text-xs">
          <div>
            <div className="text-zinc-500 font-medium mb-1">MCP Endpoint (Streamable HTTP / SSE)</div>
            <div className="flex items-center justify-between bg-[#111318] p-2.5 rounded-lg border border-white/[.07] font-mono text-zinc-300">
              <span className="truncate">{appUrl}/api/mcp</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${appUrl}/api/mcp`, 'mcp-endpoint')}
                className="text-zinc-400 hover:text-zinc-100 ml-2 shrink-0 cursor-pointer p-1"
                title="Copy endpoint"
              >
                {copiedField === 'mcp-endpoint' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-zinc-500 font-medium mb-1">OAuth Authorization Endpoint</div>
            <div className="flex items-center justify-between bg-[#111318] p-2.5 rounded-lg border border-white/[.07] font-mono text-zinc-300">
              <span className="truncate">{appUrl}/mcp/authorize</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${appUrl}/mcp/authorize`, 'mcp-auth')}
                className="text-zinc-400 hover:text-zinc-100 ml-2 shrink-0 cursor-pointer p-1"
                title="Copy auth endpoint"
              >
                {copiedField === 'mcp-auth' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-zinc-500 font-medium mb-1">OAuth Token Endpoint</div>
            <div className="flex items-center justify-between bg-[#111318] p-2.5 rounded-lg border border-white/[.07] font-mono text-zinc-300">
              <span className="truncate">{appUrl}/api/mcp/token</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${appUrl}/api/mcp/token`, 'mcp-token')}
                className="text-zinc-400 hover:text-zinc-100 ml-2 shrink-0 cursor-pointer p-1"
                title="Copy token endpoint"
              >
                {copiedField === 'mcp-token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Personal Access Token generator */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">Direct Personal Access Token (PAT)</span>
            <button
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className="py-1 px-3 rounded-lg bg-white/[.06] hover:bg-white/[.06] text-zinc-200 text-xs font-medium border border-white/10 transition cursor-pointer"
            >
              {generatingToken ? 'Generating...' : 'Generate New Token'}
            </button>
          </div>

          {newToken && (
            <div className="memory-panel p-3 text-xs space-y-1">
              <div className="text-zinc-200">Copy this token now (it won't be shown again):</div>
              <div className="flex items-center justify-between bg-[#0c0e12] p-2 rounded-lg font-mono text-zinc-100 text-[11px] break-all">
                <span>{newToken}</span>
                <button
                  onClick={() => copyToClipboard(newToken, 'pat')}
                  className="text-zinc-400 hover:text-zinc-100 ml-2 shrink-0 cursor-pointer p-1"
                >
                  {copiedField === 'pat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Export & Account Safety */}
      <div className="bg-[#111318] border border-white/[.07] rounded-xl p-6 shadow-none space-y-4">
        <h3 className="text-sm font-medium text-zinc-100 flex items-center space-x-2">
          <Download className="w-4 h-4 text-zinc-300" />
          <span>Data Export & Privacy</span>
        </h3>

        <p className="text-xs text-zinc-400">
          Export your entire PerMan database (all tasks, categories, projects, reminders, and delivery logs) as JSON anytime.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/api/export"
            download
            className="py-2.5 px-4 rounded-xl bg-white/[.06] hover:bg-white/[.06] text-zinc-100 text-xs font-semibold flex items-center space-x-2 border border-white/10 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-zinc-300" />
            <span>Export All Tasks as JSON</span>
          </a>

          <button
            onClick={handleDeleteAllData}
            className="py-2.5 px-4 rounded-xl memory-btn-secondary text-xs font-semibold flex items-center space-x-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-zinc-400" />
            <span>Clear PerMan Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
