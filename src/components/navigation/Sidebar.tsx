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
    { label: 'Memory overview', href: '/', icon: LayoutDashboard },
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
    <aside className="hidden md:flex flex-col w-56 bg-[#101216] border-r border-white/[.07] h-screen sticky top-0 text-zinc-300 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/[.07]">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-200 flex items-center justify-center font-semibold text-zinc-900 text-base ">
            PM
          </div>
          <div>
            <div className="font-bold text-zinc-100 text-base tracking-tight leading-none">PerMan</div>
            <div className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-1">
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
          className="w-full py-2.5 px-4 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-sm font-semibold flex items-center justify-center space-x-2 transition  cursor-pointer"
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
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-white/[.06] text-zinc-100 font-semibold shadow-none'
                  : 'text-zinc-400 hover:bg-white/[.06] hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-200' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/[.07] flex items-center justify-between">
        <div className="truncate pr-2">
          <div className="text-xs font-semibold text-zinc-100 truncate">
            {userEmail || 'User Workspace'}
          </div>
          <div className="text-[10px] text-zinc-500">Your personal workspace</div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 text-zinc-400 hover:text-zinc-400 hover:bg-white/[.06] rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
