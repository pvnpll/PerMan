'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronRight, Circle, Loader2, Network, Plus, Search, X } from 'lucide-react';
import type { Category, Task } from '@/lib/types';
import { buildMemoryGroups } from '@/lib/memory-map';
import { MemoryMap } from '@/components/dashboard/MemoryMap';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { parseNaturalLanguageTask } from '@/lib/nlp-parser';
import { formatShortDate, isTaskDueToday, isTaskOverdue } from '@/lib/date';

type Filter = 'Active' | 'Next actions' | 'Completed';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Active');
  const [selected, setSelected] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [capture, setCapture] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const read = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Could not load your memory. Please try again.');
        return response.json();
      };
      const [categoryData, all] = await Promise.all([
        read('/api/categories'),
        (async () => {
          const result: Task[] = [];
          let total = 0;
          do {
            const page = await read(`/api/tasks?limit=100&offset=${result.length}`);
            if (!page.tasks.length) break;
            result.push(...page.tasks);
            total = page.total;
          } while (result.length < total);
          return result;
        })(),
      ]);
      setTasks(all);
      setCategories(categoryData.categories || []);
      setSelected(old => old ? all.find(t => t.id === old.id) || null : null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your memory.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => { void refresh(); };
    window.addEventListener('perman:task_created', handler);
    return () => window.removeEventListener('perman:task_created', handler);
  }, [refresh]);

  const active = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');
  const overdue = active.filter(t => isTaskOverdue(t.due_date, t.timezone));
  const dueToday = active.filter(t => isTaskDueToday(t.due_date, t.timezone));
  const visible = useMemo(() => tasks.filter(t => {
    const statusMatch = filter === 'Completed' ? t.status === 'DONE' : filter === 'Next actions' ? t.status === 'NEXT' : t.status !== 'DONE' && t.status !== 'CANCELLED';
    return statusMatch && `${t.title} ${t.description || ''} ${t.project?.name || ''} ${t.category?.name || ''} ${t.subcategory?.name || ''}`.toLowerCase().includes(query.toLowerCase().trim());
  }), [tasks, filter, query]);
  const groups = useMemo(() => buildMemoryGroups(categories, visible), [categories, visible]);
  const focus = [...visible].sort((a, b) => {
    const rank = (t: Task) => (isTaskOverdue(t.due_date, t.timezone) ? 100 : 0) + (t.status === 'NEXT' ? 20 : 0) + ({ URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[t.priority]);
    return rank(b) - rank(a);
  });

  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!capture.trim() || saving) return;
    setSaving(true);
    try {
      const parsed = parseNaturalLanguageTask(capture);
      const response = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: parsed.title, priority: parsed.priority, status: parsed.status, due_date: parsed.dueDate, reminder_time: parsed.reminderTime, external_url: parsed.url, merchant: parsed.merchant, estimated_amount: parsed.estimatedAmount, source: 'APP' }),
      });
      if (!response.ok) throw new Error('Could not save your task. Your text is still here; please try again.');
      setCapture('');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save task.'); }
    finally { setSaving(false); }
  };

  return <div className="memory-home space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Your personal workspace</div><h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-100">A clear mind. A connected life.</h1><p className="mt-2 text-sm text-zinc-500">Everything you need to remember, in one place.</p></div>
      <Link href="/settings" className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:border-white/25 hover:text-white">Connect ChatGPT <ArrowUpRight size={13} /></Link>
    </div>
    <form onSubmit={addTask} className="memory-panel flex items-center gap-3 px-4 py-3"><Plus size={18} className="shrink-0 text-zinc-500" /><input aria-label="Capture a task" value={capture} onChange={e => setCapture(e.target.value)} placeholder="What's on your mind? Add a task, an idea, a reminder…" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600" /><button disabled={saving || !capture.trim()} className="rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-35">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Capture'}</button></form>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}<button onClick={() => void refresh()} className="underline">Retry</button></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: 'Active tasks', value: active.length, note: 'Across your life areas', color: 'text-zinc-100' },
      { label: 'Due today', value: dueToday.length, note: 'On your radar', color: 'text-zinc-100' },
      { label: 'Needs attention', value: overdue.length, note: 'Past their due date', color: overdue.length ? 'text-amber-300' : 'text-zinc-100' },
      { label: 'Completed', value: tasks.filter(t => t.status === 'DONE').length, note: 'Progress, one task at a time', color: 'text-emerald-300' },
    ].map(stat => <div key={stat.label} className="memory-panel px-4 py-4"><p className="text-xs text-zinc-500">{stat.label}</p><p className={`mt-2 text-2xl font-medium tracking-tight ${stat.color}`}>{loading ? '—' : stat.value}</p><p className="mt-1 text-[10px] text-zinc-600">{stat.note}</p></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg border border-white/[.07] bg-white/[.02] p-1 overflow-x-auto max-w-full">{(['Active', 'Next actions', 'Completed'] as Filter[]).map(item => <button key={item} onClick={() => { setFilter(item); setSelected(null); }} aria-pressed={filter === item} className={`rounded-md px-3 py-1.5 text-xs transition ${filter === item ? 'bg-white/[.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>{item}</button>)}</div><label className="flex w-full items-center gap-2 rounded-lg border border-white/[.08] px-3 py-2 sm:w-64"><Search size={14} className="text-zinc-500" /><input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} aria-label="Search your memory" placeholder="Search your memory…" className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600" />{query && <button aria-label="Clear search" onClick={() => { setQuery(''); setSelected(null); }}><X size={12} /></button>}</label></div>
    {loading ? <div className="memory-panel flex h-[530px] items-center justify-center gap-3 text-sm text-zinc-400" role="status"><Loader2 size={18} className="animate-spin" /> Loading your memory…</div> : <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <MemoryMap groups={groups} onSelectTask={setSelected} />
      <aside className="memory-panel min-h-[400px] p-5">
        {selected ? <><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Task details</p><button aria-label="Close task details" onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white"><X size={15} /></button></div><p className="mt-5 text-[10px] text-indigo-300">{[selected.category?.name, selected.subcategory?.name || selected.project?.name].filter(Boolean).join(' / ') || 'Uncategorized'}</p><h2 className="mt-2 break-words text-lg font-medium leading-7 text-zinc-100">{selected.title}</h2><div className="my-4 flex gap-2 text-[10px] text-zinc-400"><span className="rounded border border-white/10 px-2 py-1">{selected.status}</span><span className="rounded border border-white/10 px-2 py-1">{selected.priority}</span></div><p className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-400">{selected.description || 'No additional details yet.'}</p>{selected.due_date && <p className="mt-4 text-xs text-zinc-500">Due {formatShortDate(selected.due_date, selected.timezone)}</p>}{selected.external_url && <a href={selected.external_url} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center gap-2 text-xs text-indigo-300">Open reference <ArrowUpRight size={13} /></a>}<button onClick={() => setEditing(selected)} className="mt-6 w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-200 hover:bg-white/5">Edit task</button></> : <><div className="flex items-center gap-2 text-xs font-medium text-zinc-200"><Network size={14} className="text-indigo-300" /> A little perspective</div><h2 className="mt-6 text-xl font-medium leading-8 tracking-tight text-zinc-200">See the whole picture.<br /><span className="text-zinc-500">Then take the next step.</span></h2><p className="mt-4 text-xs leading-6 text-zinc-500">Your tasks connect to the areas of your life. Select a circle to explore a project, then open a task for the details.</p><div className="mt-6 space-y-3 border-t border-white/[.07] pt-5">{groups.slice(0, 5).map((g, i) => <div key={g.id} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-zinc-400"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i % 2 ? 'bg-emerald-300' : 'bg-indigo-300'}`} /><span className="truncate">{g.name}</span></span><span className="text-zinc-500">{g.tasks.length}</span></div>)}</div><p className="mt-6 text-[10px] leading-5 text-zinc-600">{visible.length} tasks · {groups.length} life areas in this view</p></>}
      </aside>
    </div>}
    <section className="memory-panel overflow-hidden"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><h2 className="text-sm font-medium text-zinc-200">{filter === 'Completed' ? 'Recently completed' : 'Your next steps'} <span className="ml-2 text-xs font-normal text-zinc-600">{visible.length}</span></h2><Link href="/tasks" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">All tasks <ArrowUpRight size={13} /></Link></div>{focus.slice(0, 6).map(task => <button key={task.id} onClick={() => { setSelected(task); setEditing(task); }} className="flex w-full items-center gap-3 border-b border-white/[.04] px-5 py-4 text-left last:border-0 hover:bg-white/[.025]">{task.status === 'DONE' ? <Check size={16} className="shrink-0 text-emerald-300" /> : <Circle size={15} className="shrink-0 text-zinc-600" />}<div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-300">{task.title}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{task.project?.name || task.subcategory?.name || task.category?.name || 'Uncategorized'}</p></div><span className={`hidden text-[10px] sm:block ${task.priority === 'URGENT' || task.priority === 'HIGH' ? 'text-amber-300' : 'text-zinc-600'}`}>{task.priority.toLowerCase()}</span><ChevronRight size={14} className="text-zinc-600" /></button>)}{!loading && !visible.length && <p className="px-5 py-8 text-center text-xs text-zinc-500">{query ? 'No tasks match your search.' : filter === 'Active' ? 'Nothing to keep track of yet. Capture your first task above.' : 'No tasks in this view.'}</p>}</section>
    <TaskEditModal task={editing} isOpen={!!editing} onClose={() => setEditing(null)} onTaskUpdated={refresh} />
  </div>;
}
