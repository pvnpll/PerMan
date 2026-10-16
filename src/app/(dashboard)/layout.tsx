'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/lib/../components/navigation/Sidebar';
import { BottomNav } from '@/lib/../components/navigation/BottomNav';
import { QuickAddModal } from '@/lib/../components/tasks/QuickAddModal';
import { createClient } from '@/lib/supabase/client';
import { Plus, Clock } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const supabase = createClient();

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

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#0c0e12]/95 backdrop-blur-md border-b border-white/[.07] px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="py-1.5 px-3.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
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
