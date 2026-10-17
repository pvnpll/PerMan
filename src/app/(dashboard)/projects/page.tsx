'use client';

import { useState, useEffect } from 'react';
import { Project, Category } from '@/lib/types';
import { Plus, Trash2, Edit2, Loader2, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10B981');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#10B981');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [updating, setUpdating] = useState(false);

  const fetchProjectsAndCategories = async () => {
    try {
      const [projRes, catRes] = await Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ]);
      setProjects(projRes.projects || []);
      setCategories(catRes.categories || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSubmitting(true);
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: description || null,
          color,
          category_id: categoryId || null,
          status: 'ACTIVE',
        }),
      });

      setProjectName('');
      setDescription('');
      setCategoryId('');
      setCreateModalOpen(false);
      fetchProjectsAndCategories();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditDescription(proj.description || '');
    setEditColor(proj.color || '#10B981');
    setEditCategory(proj.category_id || '');
    setEditStatus(proj.status);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;

    setUpdating(true);
    try {
      await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          color: editColor,
          category_id: editCategory || null,
          status: editStatus,
        }),
      });

      setEditingProject(null);
      fetchProjectsAndCategories();
    } catch {
      // ignore
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? Tasks assigned to it will remain safe.`)) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjectsAndCategories();
    } catch {
      // ignore
    }
  };

  return (
    <div className="memory-home space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="memory-eyebrow">Initiatives</p>
          <h1 className="memory-title mt-3">Projects</h1>
          <p className="memory-subtitle">
            Track major software systems, business goals, and creative builds.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="memory-btn-primary py-2 px-3.5 text-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <span className="text-xs">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="memory-panel p-12 text-center text-zinc-500 text-xs">
          No projects found. Create your first initiative above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const total = proj.task_count || 0;
            const completed = proj.completed_count || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            const assignedCat = categories.find((c) => c.id === proj.category_id);

            return (
              <div
                key={proj.id}
                className="bg-[#111318] border border-white/[.07] rounded-xl p-5 shadow-none flex flex-col justify-between hover:border-white/10 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div
                        className="w-3.5 h-3.5 rounded-md shrink-0"
                        style={{ backgroundColor: proj.color || '#3B82F6' }}
                      />
                      <h3 className="text-sm font-medium text-zinc-100 tracking-tight truncate">{proj.name}</h3>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => openEditModal(proj)}
                        title="Edit project"
                        className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/[.06] rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id, proj.name)}
                        title="Delete project"
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-white/[.06] rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {assignedCat && (
                    <div className="mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[.04] text-zinc-400 border border-white/[.07]">
                        {assignedCat.name}
                      </span>
                    </div>
                  )}

                  {proj.description && (
                    <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{proj.description}</p>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                      <span>Progress</span>
                      <span>{progress}% ({completed}/{total})</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0c0e12] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: proj.color || '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[.07] flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    Status: {proj.status}
                  </span>
                  <Link
                    href={`/tasks?project_id=${proj.id}`}
                    className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center space-x-1"
                  >
                    <span>View Tasks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-sm shadow-none p-5">
            <h3 className="text-sm font-medium text-zinc-100 mb-3">Create New Project</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Calflow or Mobile App"
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project purpose..."
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white/25 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Color Accent
                </label>
                <div className="flex gap-2">
                  {['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4'].map(
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
                  disabled={submitting || !projectName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111318] border border-white/[.07] rounded-xl w-full max-w-sm shadow-none p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-100">Edit Project</h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
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

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/25"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white/25 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Color Accent
                </label>
                <div className="flex gap-2">
                  {['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          editColor === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/[.07] text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-white text-zinc-900"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
