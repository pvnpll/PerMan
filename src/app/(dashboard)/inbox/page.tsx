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
    window.addEventListener('perman:task_created', handleCreated);
    return () => window.removeEventListener('perman:task_created', handleCreated);
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
    <div className="memory-home space-y-6">
      <div>
        <p className="memory-eyebrow">Quick capture</p>
        <h1 className="memory-title mt-3">Inbox</h1>
        <p className="memory-subtitle">
          Dump tasks instantly without worrying about categories or deadlines. Process them later.
        </p>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleQuickAdd} className="memory-panel p-4">
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Capture anything on your mind..."
            className="memory-input flex-1 px-4 py-3 text-sm placeholder-zinc-600 transition"
          />
          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="memory-btn-primary px-5 py-3 text-sm flex items-center space-x-2 disabled:opacity-50"
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
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Unprocessed items ({tasks.length})</span>
        </div>

        {tasks.length === 0 ? (
          <div className="memory-panel p-12 text-center">
            <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="text-sm text-zinc-200">Your inbox is clear</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-6">
              Everything has been organized or scheduled. Capture your next idea above.
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
