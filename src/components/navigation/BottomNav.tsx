'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FolderKanban,
  Settings,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  onOpenQuickAdd: () => void;
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname();

  const links = [
    { label: 'Memory', href: '/', icon: LayoutDashboard },
    { label: 'Inbox', href: '/inbox', icon: Inbox },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#101216]/95 backdrop-blur-md border-t border-white/[.07] z-40 px-2 py-1 flex items-center justify-around">
      {links.slice(0, 2).map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs font-medium transition ${
              isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span>{link.label}</span>
          </Link>
        );
      })}

      {/* Center Floating Quick Add */}
      <button
        type="button"
        onClick={onOpenQuickAdd}
        className="w-12 h-12 -mt-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-2 border-slate-900 transition active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {links.slice(2).map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs font-medium transition ${
              isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
