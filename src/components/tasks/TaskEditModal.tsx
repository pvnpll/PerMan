'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Bell, Folder, Tag, Loader2, ArrowRight } from 'lucide-react';
import { Task, Category, Project } from '@/lib/types';

interface TaskEditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskEditModal({ task, isOpen, onClose, onTaskUpdated }: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<any>('INBOX');
  const [priority, setPriority] = useState<any>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
      setReminderTime(task.reminder_time ? task.reminder_time.slice(0, 16) : '');
      setProjectId(task.project_id || '');
      setMerchant(task.merchant || '');
      setAmount(task.estimated_amount !== null && task.estimated_amount !== undefined ? task.estimated_amount.toString() : '');

      // Resolve category and subcategory
      const directCatId = task.category_id || '';
      const directSubId = task.subcategory_id || '';
      if (directSubId) {
        setCategoryId(directCatId);
        setSubcategoryId(directSubId);
      } else if (directCatId) {
        // Check if directCatId is actually a subcategory
        const parentCat = categories.find((c) => c.subcategories?.some((s) => s.id === directCatId));
        if (parentCat) {
          setCategoryId(parentCat.id);
          setSubcategoryId(directCatId);
        } else {
          setCategoryId(directCatId);
          setSubcategoryId('');
        }
      } else {
        setCategoryId('');
        setSubcategoryId('');
      }
    }
  }, [task, categories]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories').then((r) => r.json()).then((d) => d.categories && setCategories(d.categories));
      fetch('/api/projects').then((r) => r.json()).then((d) => d.projects && setProjects(d.projects));
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        reminder_time: reminderTime ? new Date(reminderTime).toISOString() : null,
        project_id: projectId || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        merchant: merchant || null,
        estimated_amount: amount ? parseFloat(amount) : null,
      };

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update task');
      }

      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-lg shadow-none overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/[.07]">
          <span className="font-semibold text-zinc-100 text-base">Edit Task</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-white/[.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="memory-panel p-3 text-zinc-200 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              >
                <option value="INBOX">Inbox</option>
                <option value="NEXT">Next</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="WAITING">Waiting</option>
                <option value="DONE">Done</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Reminder Time
              </label>
              <input
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          <div className={`grid ${availableSubcategories.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
                className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {availableSubcategories.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Subcategory
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
                >
                  <option value="">No Subcategory</option>
                  {availableSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/[.07] text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 transition flex items-center space-x-1.5 shadow-none  disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
