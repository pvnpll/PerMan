'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { Inbox, Plus, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { parseNaturalLanguageTask } from '@/lib/nlp-parser';

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchInbox = async () => {
    try {
      const res = await fetch('/api/tasks?status=INBOX');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const handleCreated = () => fetchInbox();
    window.addEventListener('permang:task_created', handleCreated);
    return () => window.removeEventListener('permang:task_created', handleCreated);
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setSubmitting(true);
    try {
      const parsed = parseNaturalLanguageTask(input);

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.title,
          status: 'INBOX',
          priority: parsed.priority || 'MEDIUM',
          due_date: parsed.dueDate || null,
          reminder_time: parsed.reminderTime || null,
          merchant: parsed.merchant || null,
          estimated_amount: parsed.estimatedAmount || null,
          external_url: parsed.url || null,
          source: 'APP',
        }),
      });

      setInput('');
      fetchInbox();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <Inbox className="w-4 h-4" />
          <span>Quick Capture</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Inbox</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Dump tasks instantly without worrying about categories or deadlines. Process them later.
        </p>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleQuickAdd} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Capture anything on your mind..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Inbox Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Unprocessed Items ({tasks.length})</span>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">Your Inbox is completely clear!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Everything has been organized or scheduled. Enjoy your clear head or capture your next idea above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchInbox}
                onEdit={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onTaskUpdated={fetchInbox}
      />
    </div>
  );
}
