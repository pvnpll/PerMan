'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { QuickAddModal } from '@/components/tasks/QuickAddModal';
import { createClient } from '@/lib/supabase/client';
import { Plus, Clock, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        fetch('/api/account').catch(() => {});
      }
    });

    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        }).format(new Date())
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#0c0e12]/95 backdrop-blur-md border-b border-white/[.07] px-4 md:px-8 flex items-center justify-between">
          {/* Mobile Brand / Desktop Clock */}
          <div className="flex items-center space-x-2.5">
            {/* Mobile Brand Logo */}
            <Link href="/" className="flex md:hidden items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-200 flex items-center justify-center font-bold text-zinc-900 text-xs">
                PM
              </div>
              <span className="font-bold text-zinc-100 text-sm tracking-tight">PerMan</span>
            </Link>

            {/* Desktop Time Display */}
            <div className="hidden md:flex items-center space-x-2 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Subtle compact clock on tablet/large mobile */}
            <div className="hidden sm:flex md:hidden items-center space-x-1.5 text-[11px] text-zinc-500 mr-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{currentTime}</span>
            </div>

            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="py-1.5 px-3 md:px-3.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Quick Add</span>
              <span className="xs:hidden">Add</span>
            </button>

            {/* Mobile & Header Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 md:p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[.06] rounded-lg transition flex items-center space-x-1 text-xs cursor-pointer border border-transparent hover:border-white/[.08]"
            >
              <LogOut className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
              <span className="hidden sm:inline text-zinc-400">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenQuickAdd={() => setQuickAddOpen(true)} />

      {/* Global Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={() => {
          window.dispatchEvent(new CustomEvent('perman:task_created'));
        }}
      />
    </div>
  );
}
