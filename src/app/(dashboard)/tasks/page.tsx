'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Task, Category, Project } from '@/lib/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { QuickAddModal } from '@/components/tasks/QuickAddModal';
import {
  CheckSquare,
  Search,
  Filter,
  ArrowUpDown,
  Archive,
  Loader2,
  X,
  Plus,
  Folder,
} from 'lucide-react';

function TasksContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category_id') || '';
  const initialProject = searchParams.get('project_id') || '';
  const initialStatus = searchParams.get('status') || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subcategoryId, setSubcategoryId] = useState('');
  const [projectId, setProjectId] = useState(initialProject);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showArchived, setShowArchived] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const catParam = searchParams.get('category_id');
    const subParam = searchParams.get('subcategory_id');
    const projParam = searchParams.get('project_id');
    const statusParam = searchParams.get('status');

    if (projParam !== null) setProjectId(projParam);
    if (statusParam !== null) setStatus(statusParam);

    if (catParam) {
      const parent = categories.find((c) => c.id === catParam);
      if (parent) {
        setCategoryId(parent.id);
        if (subParam) setSubcategoryId(subParam);
      } else {
        const foundParent = categories.find((c) =>
          c.subcategories?.some((s) => s.id === catParam)
        );
        if (foundParent) {
          setCategoryId(foundParent.id);
          setSubcategoryId(catParam);
        } else {
          setCategoryId(catParam);
          if (subParam) setSubcategoryId(subParam);
        }
      }
    } else if (subParam) {
      setSubcategoryId(subParam);
    }
  }, [searchParams, categories]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (categoryId) params.set('category_id', categoryId);
      if (subcategoryId) params.set('subcategory_id', subcategoryId);
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
  }, [query, status, priority, categoryId, subcategoryId, projectId, sortBy, sortDir, showArchived]);

  useEffect(() => {
    const handleCreated = () => fetchTasks();
    window.addEventListener('perman:task_created', handleCreated);
    return () => window.removeEventListener('perman:task_created', handleCreated);
  }, []);

  const resetFilters = () => {
    setQuery('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setSubcategoryId('');
    setProjectId('');
    setShowArchived(false);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];
  const selectedSubcategory = availableSubcategories.find((s) => s.id === subcategoryId);

  const hasActiveFilters = query || status || priority || categoryId || subcategoryId || projectId || showArchived;

  return (
    <div className="memory-home space-y-6">
      <div>
        <p className="memory-eyebrow">Full registry</p>
        <h1 className="memory-title mt-3">All Tasks</h1>
        <p className="memory-subtitle">
          Search, filter, and organize all your commitments across projects and life areas.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="memory-panel p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, or vendor..."
            className="w-full bg-[#0c0e12] border border-white/[.07] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/25 transition"
          />
        </div>

        {/* Filters Grid */}
        <div className={`grid grid-cols-2 ${availableSubcategories.length > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-2`}>
          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
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
            className="bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
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
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
            }}
            className="bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subcategory */}
          {availableSubcategories.length > 0 && (
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
            >
              <option value="">All Subcategories</option>
              {availableSubcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Project */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
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
            className="col-span-2 md:col-span-1 bg-[#0c0e12] border border-white/[.07] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="due_date-asc">Due Date (Earliest)</option>
            <option value="priority-desc">Priority</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>

        {/* Clear Filters & Archive Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded-sm bg-[#0c0e12] border-white/[.07] text-zinc-400 focus:ring-0"
            />
            <span>Show Archived Tasks</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-zinc-300 hover:text-zinc-300 flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <div className="text-xs text-zinc-400 font-medium">
          Found {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-xs">Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-[#111318] border border-white/[.07] rounded-xl p-10 text-center text-zinc-400 text-xs space-y-4">
            <div className="w-10 h-10 rounded-full bg-white/[.04] border border-white/[.07] flex items-center justify-center mx-auto text-zinc-400">
              <Folder className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="font-semibold text-zinc-100 text-sm">
                No tasks found
                {selectedCategory ? ` in ${selectedCategory.name}` : ''}
                {selectedSubcategory ? ` / ${selectedSubcategory.name}` : ''}
              </p>
              <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No tasks match your current filter selection. You can clear your filters or quickly add a new task here.'
                  : 'Your registry is clear. Get started by capturing your first task.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task{selectedCategory ? ` in ${selectedCategory.name}` : ''}</span>
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[.08] text-zinc-300 hover:text-white hover:bg-white/[.05] text-xs transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
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

      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={fetchTasks}
        defaultCategoryId={categoryId}
        defaultSubcategoryId={subcategoryId}
        defaultProjectId={projectId}
      />
    </div>
  );
}

export default function AllTasksPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <span className="text-xs">Loading task registry...</span>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
