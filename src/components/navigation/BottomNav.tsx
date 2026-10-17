'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Settings,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  onOpenQuickAdd: () => void;
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#101216]/95 backdrop-blur-md border-t border-white/[.07] z-40 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 items-center w-full max-w-lg mx-auto">
        {/* Tab 1: Memory Overview */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium transition ${
            pathname === '/' ? 'text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-1 ${pathname === '/' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          <span className="truncate">Memory</span>
        </Link>

        {/* Tab 2: Inbox */}
        <Link
          href="/inbox"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium transition ${
            pathname === '/inbox' ? 'text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <Inbox className={`w-5 h-5 mb-1 ${pathname === '/inbox' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          <span className="truncate">Inbox</span>
        </Link>

        {/* Center Floating Quick Add (Exactly Column 3) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenQuickAdd}
            aria-label="Capture task"
            className="w-11 h-11 -mt-5 rounded-full bg-zinc-200 hover:bg-white text-zinc-900 flex items-center justify-center shadow-lg shadow-black/40 border-2 border-[#0c0e12] transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab 3: Tasks */}
        <Link
          href="/tasks"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium transition ${
            pathname === '/tasks' ? 'text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <CheckSquare className={`w-5 h-5 mb-1 ${pathname === '/tasks' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          <span className="truncate">Tasks</span>
        </Link>

        {/* Tab 4: Settings */}
        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium transition ${
            pathname === '/settings' ? 'text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <Settings className={`w-5 h-5 mb-1 ${pathname === '/settings' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          <span className="truncate">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
