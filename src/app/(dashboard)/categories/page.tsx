'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Category } from '@/lib/types';
import { Plus, ChevronRight, ChevronDown, Trash2, Loader2, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [color, setColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}: Failed to fetch categories`);
      }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      setFetchError(err.message || 'Could not load categories. Please check your connection and retry.');
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
    setCreateError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName.trim(),
          parent_id: parentId || null,
          color,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || `Failed to create category (HTTP ${res.status})`);
        return;
      }

      setCategoryName('');
      setParentId('');
      setCreateModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setCreateError(err.message || 'Network error while creating category. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Tasks assigned to it will remain safe.`)) return;

    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || `Failed to delete "${name}" (HTTP ${res.status})`);
        return;
      }
      await fetchCategories();
    } catch (err: any) {
      setActionError(err.message || `Network error while deleting "${name}". Please retry.`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="memory-home space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="memory-eyebrow">Taxonomy</p>
          <h1 className="memory-title mt-3">Categories & Life Areas</h1>
          <p className="memory-subtitle">
            Your memory, organized into life areas, projects, and subcategories. Active, completed, and total task counts update automatically.
          </p>
        </div>

        <button
          onClick={() => {
            setParentId('');
            setCreateError(null);
            setCreateModalOpen(true);
          }}
          className="memory-btn-primary py-2 px-3.5 text-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {actionError && (
        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-zinc-400 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <span className="text-xs">Loading categories and counts...</span>
        </div>
      ) : fetchError ? (
        <div role="alert" className="memory-panel p-8 text-center space-y-3">
          <div className="text-red-400 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{fetchError}</span>
          </div>
          <p className="text-xs text-zinc-500">Failed to load categories or calculate task counts.</p>
          <button
            onClick={fetchCategories}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white/[.08] hover:bg-white/[.15] text-zinc-200 transition"
          >
            Retry Loading
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="memory-panel p-12 text-center text-zinc-500 text-xs">
          No categories found. Categories will be automatically seeded once migrations are applied!
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-zinc-500">
            Counts reflect non-archived commitments. Total includes active, completed, and cancelled tasks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const isExp = expanded[cat.id] ?? true;
              const subCount = cat.subcategories?.length || 0;
              const counts = cat.counts || { active: 0, completed: 0, total: 0 };

              return (
                <div
                  key={cat.id}
                  className="bg-[#111318] border border-white/[.07] rounded-xl p-4 shadow-none flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/tasks?category_id=${cat.id}`}
                        className="flex items-center space-x-2.5 cursor-pointer min-w-0 flex-1 group"
                        title="View tasks in this category"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0 group-hover:scale-110 transition"
                          style={{ backgroundColor: cat.color || '#3B82F6' }}
                        />
                        <h3 className="text-sm font-medium text-zinc-100 tracking-tight truncate group-hover:text-white group-hover:underline">
                          {cat.name}
                        </h3>
                        <span className="hidden sm:inline-block text-[10px] text-zinc-500 font-medium px-2 py-0.5 bg-[#0c0e12] rounded-full border border-white/[.07] shrink-0">
                          {subCount} subcategories
                        </span>
                        <span className="sm:hidden text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-[#0c0e12] rounded-full border border-white/[.07] shrink-0">
                          {subCount}
                        </span>
                      </Link>

                      <div className="flex items-center space-x-1 shrink-0">
                        <Link
                          href={`/tasks?category_id=${cat.id}`}
                          title="View tasks in this category"
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/[.06] rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setParentId(cat.id);
                            setCreateError(null);
                            setCreateModalOpen(true);
                          }}
                          title="Add subcategory"
                          className="p-1 text-zinc-400 hover:text-zinc-300 hover:bg-white/[.06] rounded-lg transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          disabled={deletingId === cat.id}
                          title="Delete category"
                          aria-label={`Delete category ${cat.name}`}
                          className="p-1 text-zinc-500 hover:text-zinc-400 hover:bg-white/[.06] rounded-lg transition"
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {subCount > 0 && (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            title={isExp ? 'Collapse subcategories' : 'Expand subcategories'}
                            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[.06] rounded-lg transition"
                          >
                            {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Task Counts (PM-199) */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-medium border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {counts.active} active
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {counts.completed} done
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[.04] text-zinc-400 font-medium border border-white/[.06]"
                        title="Total includes active, completed, and cancelled tasks"
                      >
                        {counts.total} total
                      </span>
                    </div>

                    {/* Subcategories with Counts */}
                    {isExp && subCount > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/[.07] space-y-1.5">
                        {cat.subcategories?.map((sub) => {
                          const subCounts = sub.counts || { active: 0, completed: 0, total: 0 };
                          return (
                            <Link
                              key={sub.id}
                              href={`/tasks?category_id=${cat.id}&subcategory_id=${sub.id}`}
                              className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-white/[.02] hover:bg-white/[.06] text-zinc-300 hover:text-white transition group cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 min-w-0 pr-2">
                                <span className="text-zinc-600 group-hover:text-zinc-400 shrink-0">•</span>
                                <span className="group-hover:underline truncate">{sub.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                  <span className="text-amber-400/90 font-medium">{subCounts.active} active</span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-emerald-400/90 font-medium">{subCounts.completed} done</span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-500" title="Total non-archived tasks">{subCounts.total} total</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={deletingId === sub.id}
                                  aria-label={`Delete subcategory ${sub.name}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete(sub.id, sub.name);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 transition"
                                >
                                  {deletingId === sub.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Action Link */}
                  <div className="mt-3 pt-2.5 border-t border-white/[.05] flex items-center justify-between text-[11px] text-zinc-400">
                    <Link
                      href={`/tasks?category_id=${cat.id}`}
                      className="hover:text-zinc-200 hover:underline flex items-center space-x-1 text-zinc-400 hover:text-white transition"
                    >
                      <span>View tasks in {cat.name}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    {subCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.id)}
                        className="text-zinc-500 hover:text-zinc-300 transition text-[10px]"
                      >
                        {isExp ? 'Hide subcategories' : `Show ${subCount} subcategories`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-sm shadow-none p-5">
            <h3 className="text-sm font-medium text-zinc-100 mb-3">
              {parentId ? 'Add Subcategory' : 'Add Category'}
            </h3>

            {createError && (
              <div role="alert" className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Type / Parent
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
                >
                  <option value="">Top-Level Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Subcategory of {c.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  onClick={() => {
                    setCreateModalOpen(false);
                    setCreateError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/[.07] text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !categoryName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Creating...' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
