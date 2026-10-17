'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Calendar, Bell, Folder, Tag, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { parseNaturalLanguageTask } from '@/lib/nlp-parser';
import { Category, Project } from '@/lib/types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  defaultStatus?: string;
  defaultProjectId?: string;
  defaultCategoryId?: string;
}

export function QuickAddModal({
  isOpen,
  onClose,
  onTaskCreated,
  defaultStatus = 'INBOX',
  defaultProjectId,
  defaultCategoryId,
}: QuickAddModalProps) {
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoriesAndProjects = async () => {
    try {
      const [catRes, projRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/projects').then((r) => r.json()),
      ]);
      if (catRes.categories) setCategories(catRes.categories);
      if (projRes.projects) setProjects(projRes.projects);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategoriesAndProjects();
    }
  }, [isOpen]);

  // Live NLP preview
  const parsedPreview = rawText.trim() ? parseNaturalLanguageTask(rawText) : null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    const parsed = parseNaturalLanguageTask(text);
    setTitle(parsed.title);
    if (parsed.priority) setPriority(parsed.priority);
    if (parsed.dueDate) setDueDate(parsed.dueDate.slice(0, 16));
    if (parsed.reminderTime) setReminderTime(parsed.reminderTime.slice(0, 16));
    if (parsed.merchant) setMerchant(parsed.merchant);
    if (parsed.estimatedAmount) setAmount(parsed.estimatedAmount.toString());

    // Match category or subcategory
    if (parsed.categoryName && categories.length > 0) {
      const term = parsed.categoryName.toLowerCase();
      let matched = false;
      for (const c of categories) {
        const sub = c.subcategories?.find((s) => s.name.toLowerCase().includes(term));
        if (sub) {
          setCategoryId(c.id);
          setSubcategoryId(sub.id);
          matched = true;
          break;
        }
      }
      if (!matched) {
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes(term)
        );
        if (matchedCat) {
          setCategoryId(matchedCat.id);
          setSubcategoryId('');
        }
      }
    }

    // Match project
    if (parsed.projectName && projects.length > 0) {
      const matchedProj = projects.find((p) =>
        p.name.toLowerCase().includes(parsed.projectName!.toLowerCase())
      );
      if (matchedProj) setProjectId(matchedProj.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || rawText.trim();
    if (!finalTitle) return;

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        title: finalTitle,
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
        source: 'APP',
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      // Reset
      setRawText('');
      setTitle('');
      setDescription('');
      setDueDate('');
      setReminderTime('');
      setMerchant('');
      setAmount('');
      setSubcategoryId('');
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-lg shadow-none overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-white/[.07]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-zinc-300" />
            <span className="font-semibold text-zinc-100 text-base">Quick Capture</span>
          </div>
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
            <textarea
              autoFocus
              rows={2}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder='Type anything... e.g. "Buy headphones from Amazon next month" or "Fix Calflow API tomorrow at 5pm"'
              className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl p-3 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-white/25  transition resize-none"
            />
          </div>

          {/* Natural Language Inferred Tags */}
          {parsedPreview && (
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-white/[.02] rounded-xl border border-white/[.07] text-xs text-zinc-300">
              <span className="text-zinc-500 font-medium">Inferred:</span>
              {parsedPreview.projectName && (
                <span className="px-2 py-0.5 rounded-md memory-chip text-zinc-300 bg-white/[.03]">
                  📁 {parsedPreview.projectName}
                </span>
              )}
              {parsedPreview.categoryName && (
                <span className="px-2 py-0.5 rounded-md memory-chip text-zinc-300 bg-white/[.03]">
                  🏷️ {parsedPreview.categoryName}
                </span>
              )}
              {parsedPreview.merchant && (
                <span className="memory-chip text-zinc-300 bg-white/[.03] px-2 py-0.5">
                  🛒 {parsedPreview.merchant}
                </span>
              )}
              {parsedPreview.dueDate && (
                <span className="px-2 py-0.5 rounded-md memory-chip text-zinc-300 bg-white/[.03]">
                  📅 Due {new Date(parsedPreview.dueDate).toLocaleDateString()}
                </span>
              )}
              {parsedPreview.reminderTime && (
                <span className="px-2 py-0.5 rounded-md memory-chip text-zinc-300 bg-white/[.03]">
                  ⏰ Reminder {new Date(parsedPreview.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {parsedPreview.priority && parsedPreview.priority !== 'MEDIUM' && (
                <span className="px-2 py-0.5 rounded-md memory-chip text-zinc-100 bg-white/[.05]">
                  ⚡ {parsedPreview.priority}
                </span>
              )}
            </div>
          )}

          {/* Quick Controls */}
          <div className="grid grid-cols-2 gap-3">
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
                <option value="NEXT">Next Action</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="WAITING">Waiting On</option>
              </select>
            </div>
          </div>

          {/* Toggle Advanced Fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-zinc-300 hover:text-zinc-300 transition"
            >
              {showAdvanced ? '- Hide Details' : '+ Add Due Date, Reminder, Project & Category'}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-white/[.07]">
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

              {(() => {
                const selectedCat = categories.find((c) => c.id === categoryId);
                const subcats = selectedCat?.subcategories || [];
                return (
                  <div className={`grid ${subcats.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
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

                    {subcats.length > 0 && (
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
                          {subcats.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/25"
                />
              </div>
            </div>
          )}

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
              disabled={loading || !rawText.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 transition flex items-center space-x-1.5 shadow-none  disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Save Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
