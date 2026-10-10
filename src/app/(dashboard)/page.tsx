'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { parseNaturalLanguageTask } from '@/lib/nlp-parser';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickInput, setQuickInput] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    const handleCreated = () => fetchSummary();
    window.addEventListener('permang:task_created', handleCreated);
    return () => window.removeEventListener('permang:task_created', handleCreated);
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    setQuickLoading(true);
    try {
      const parsed = parseNaturalLanguageTask(quickInput);

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.title,
          priority: parsed.priority || 'MEDIUM',
          due_date: parsed.dueDate || null,
          reminder_time: parsed.reminderTime || null,
          status: parsed.status || 'INBOX',
          merchant: parsed.merchant || null,
          estimated_amount: parsed.estimatedAmount || null,
          external_url: parsed.url || null,
          source: 'APP',
        }),
      });

      setQuickInput('');
      fetchSummary();
    } catch {
      // ignore
    } finally {
      setQuickLoading(false);
    }
  };

  const stats = summary?.stats || {
    overdueCount: 0,
    dueTodayCount: 0,
    completedTodayCount: 0,
    highPriorityCount: 0,
    inboxCount: 0,
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Natural Language Quick Capture */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Natural Language Capture</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Today & Focus
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1 mb-4">
          Type tasks naturally. We automatically extract dates, times, priorities, and projects.
        </p>

        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder='e.g. "Buy vitamins from Amazon tomorrow at 10am" or "Fix Calflow login urgent"'
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={quickLoading || !quickInput.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Due Today</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.dueTodayCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Scheduled for today</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-2">{stats.overdueCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Requires attention</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>High Priority</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{stats.highPriorityCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Urgent & High tasks</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {stats.completedTodayCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Done today</div>
        </div>
      </div>

      {/* Overdue Tasks Section (If any) */}
      {summary?.overdue?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-red-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Overdue Tasks ({summary.overdue.length})</span>
          </div>
          <div className="space-y-2">
            {summary.overdue.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchSummary}
                onEdit={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
          <Calendar className="w-4 h-4" />
          <span>Due Today ({summary?.dueToday?.length || 0})</span>
        </div>
        {summary?.dueToday?.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
            🎉 Nothing due today! Check your upcoming tasks or add a new one.
          </div>
        ) : (
          <div className="space-y-2">
            {summary?.dueToday?.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchSummary}
                onEdit={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* High Priority Tasks */}
      {summary?.highPriority?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
            <Zap className="w-4 h-4" />
            <span>High Priority & Urgent ({summary.highPriority.length})</span>
          </div>
          <div className="space-y-2">
            {summary.highPriority.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchSummary}
                onEdit={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {summary?.upcoming?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Upcoming Tasks ({summary.upcoming.length})</span>
          </div>
          <div className="space-y-2">
            {summary.upcoming.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchSummary}
                onEdit={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onTaskUpdated={fetchSummary}
      />
    </div>
  );
}
