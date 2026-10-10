'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { FolderKanban, Plus, CheckCircle, Clock, Trash2, Edit2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10B981');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
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
          status: 'ACTIVE',
        }),
      });

      setProjectName('');
      setDescription('');
      setCreateModalOpen(false);
      fetchProjects();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? Tasks assigned to it will remain safe.`)) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <FolderKanban className="w-4 h-4" />
            <span>Initiatives</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track major software systems, business goals, and creative builds.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <span className="text-xs">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No projects found. Projects will be seeded automatically once migrations are applied!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const total = proj.task_count || 0;
            const completed = proj.completed_count || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={proj.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-md shrink-0"
                        style={{ backgroundColor: proj.color || '#3B82F6' }}
                      />
                      <h3 className="text-base font-bold text-white tracking-tight">{proj.name}</h3>
                    </div>

                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Delete project"
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{proj.description}</p>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                      <span>Progress</span>
                      <span>{progress}% ({completed}/{total})</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
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

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Status: {proj.status}
                  </span>
                  <Link
                    href={`/tasks?project_id=${proj.id}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Create New Project</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Calflow or Mobile App"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project purpose..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
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
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !projectName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
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
