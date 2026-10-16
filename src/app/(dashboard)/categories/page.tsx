'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { Tags, Plus, ChevronRight, ChevronDown, Trash2, Edit2, Loader2, Sparkles } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [color, setColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setSubmitting(true);
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          parent_id: parentId || null,
          color,
        }),
      });

      setCategoryName('');
      setParentId('');
      setCreateModalOpen(false);
      fetchCategories();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Tasks assigned to it will remain safe.`)) return;

    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch {
      // ignore
    }
  };

  return (
    <div className="memory-home space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="memory-eyebrow">Taxonomy</p>
          <h1 className="memory-title mt-3">Categories & Life Areas</h1>
          <p className="memory-subtitle">
            Your memory, organized into life areas, projects, and subcategories. ChatGPT can create groups as you add tasks.
          </p>
        </div>

        <button
          onClick={() => {
            setParentId('');
            setCreateModalOpen(true);
          }}
          className="memory-btn-primary py-2 px-3.5 text-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <span className="text-xs">Loading categories...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="memory-panel p-12 text-center text-zinc-500 text-xs">
          No categories found. Categories will be automatically seeded once migrations are applied!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const isExp = expanded[cat.id] ?? true;
            const subCount = cat.subcategories?.length || 0;

            return (
              <div
                key={cat.id}
                className="bg-[#111318] border border-white/[.07] rounded-xl p-4 shadow-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center space-x-2.5 cursor-pointer flex-1"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#3B82F6' }}
                    />
                    <h3 className="text-sm font-medium text-zinc-100 tracking-tight">{cat.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-medium px-2 py-0.5 bg-[#0c0e12] rounded-full border border-white/[.07]">
                      {subCount} subcategories
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setParentId(cat.id);
                        setCreateModalOpen(true);
                      }}
                      title="Add subcategory"
                      className="p-1 text-zinc-400 hover:text-zinc-300 hover:bg-white/[.06] rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      title="Delete category"
                      className="p-1 text-zinc-500 hover:text-zinc-400 hover:bg-white/[.06] rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                    >
                      {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {isExp && subCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[.07] space-y-1.5">
                    {cat.subcategories?.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/[.02] hover:bg-white/[.06] text-zinc-300 transition group"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-zinc-600">•</span>
                          <span>{sub.name}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-400 p-0.5 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-sm shadow-none p-5">
            <h3 className="text-sm font-medium text-zinc-100 mb-3">
              {parentId ? 'Add Subcategory' : 'Add Top-Level Category'}
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Category title..."
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white/25"
                />
              </div>

              {!parentId && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Badge Color
                  </label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'].map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            color === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/[.07] text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !categoryName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
