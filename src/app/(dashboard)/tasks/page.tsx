'use client';

import { useState, useEffect } from 'react';
import { Task, Category, Project } from '@/lib/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import {
  CheckSquare,
  Search,
  Filter,
  ArrowUpDown,
  Archive,
  Loader2,
  X,
} from 'lucide-react';

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showArchived, setShowArchived] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (categoryId) params.set('category_id', categoryId);
      if (projectId) params.set('project_id', projectId);
      params.set('sort_by', sortBy);
      params.set('sort_direction', sortDir);
      if (showArchived) params.set('archived', 'true');

      const res = await fetch(`/api/tasks?${params.toString()}`);
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
    fetch('/api/categories').then((r) => r.json()).then((d) => d.categories && setCategories(d.categories));
    fetch('/api/projects').then((r) => r.json()).then((d) => d.projects && setProjects(d.projects));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 200);
    return () => clearTimeout(timer);
  }, [query, status, priority, categoryId, projectId, sortBy, sortDir, showArchived]);

  useEffect(() => {
    const handleCreated = () => fetchTasks();
    window.addEventListener('permang:task_created', handleCreated);
    return () => window.removeEventListener('permang:task_created', handleCreated);
  }, []);

  const resetFilters = () => {
    setQuery('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setProjectId('');
    setShowArchived(false);
  };

  const hasActiveFilters = query || status || priority || categoryId || projectId || showArchived;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <CheckSquare className="w-4 h-4" />
          <span>Full Registry</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">All Tasks</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Search, filter, and organize all your commitments across projects and life areas.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, or vendor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="INBOX">Inbox</option>
            <option value="NEXT">Next Action</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="WAITING">Waiting On</option>
            <option value="DONE">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Project */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [col, dir] = e.target.value.split('-');
              setSortBy(col);
              setSortDir(dir);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="due_date-asc">Due Date (Earliest)</option>
            <option value="priority-desc">Priority</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>

        {/* Clear Filters & Archive Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded-sm bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>Show Archived Tasks</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400 font-medium">
          Found {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-xs">Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
            No tasks match the selected criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={fetchTasks}
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
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
}
