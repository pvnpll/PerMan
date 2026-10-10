'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FolderKanban,
  Tags,
  Calendar,
  Settings,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  onOpenQuickAdd: () => void;
  userEmail?: string | null;
}

export function Sidebar({ onOpenQuickAdd, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    { label: 'Today & Overview', href: '/', icon: LayoutDashboard },
    { label: 'Inbox', href: '/inbox', icon: Inbox },
    { label: 'All Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Categories', href: '/categories', icon: Tags },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Settings & MCP', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-600/30">
            PM
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight leading-none">PerMang</div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
              Personal Memory
            </div>
          </div>
        </Link>
      </div>

      {/* Global Quick Add Button */}
      <div className="p-4">
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Capture Task</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-800 text-indigo-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="truncate pr-2">
          <div className="text-xs font-semibold text-white truncate">
            {userEmail || 'User Workspace'}
          </div>
          <div className="text-[10px] text-slate-500">Connected to Supabase</div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
