'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import { completionStreak } from '@/lib/workspace';
import type { Task } from '@/lib/types';
import { formatTimeOnly, isTaskDueToday, isTaskOverdue } from '@/lib/date';
import { rankNextTasks, type Energy, type TaskFit } from '@/lib/next-task';

const button = 'rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40';
const select = 'mt-1 w-full rounded-lg border border-white/15 bg-zinc-900 p-2 text-sm text-zinc-200';

export function TodayPanel({ tasks, onEdit, onRefresh }: { tasks: Task[]; onEdit: (task: Task) => void; onRefresh: () => Promise<void> }) {
  const [minutes, setMinutes] = useState(25);
  const [energy, setEnergy] = useState<Energy>('MEDIUM');
  const workspace = useWorkspace();
  const fits: Record<string, TaskFit> = {};
  for (const item of workspace.items) if (item.kind === 'FIT' && item.data.task_id) fits[item.data.task_id] = item.data;
  const preferences = workspace.items.find(item => item.kind === 'PREFERENCES');
  const [note, setNote] = useState('');
  const [pendingMotivation, setPendingMotivation] = useState<boolean | null>(null);
  const showMotivation = pendingMotivation ?? preferences?.data.motivation ?? false;
  const saveFit = async (task: Task, fit: TaskFit) => {
    if (busy || workspace.loading || workspace.error) return;
    setBusy(true); setError('');
    try {
      const existing = workspace.items.find(item => item.kind === 'FIT' && item.data.task_id === task.id);
      await workspace.save({ id: existing?.id, kind: 'FIT', title: task.title, content: '', data: { task_id: task.id, ...fit } });
    } catch { setError('Could not save estimate. Please retry.'); }
    finally { setBusy(false); }
  };
  const savePreferences = async (motivation: boolean, goal = preferences?.data.goal || 3) => {
    if (busy) return;
    setBusy(true); setError(''); setPendingMotivation(motivation);
    try { await workspace.save({ id: preferences?.id, kind: 'PREFERENCES', title: 'My preferences', content: '', data: { motivation, goal } }); }
    catch { setError('Could not save preferences.'); }
    finally { setBusy(false); setPendingMotivation(null); }
  };
  const [skipped, setSkipped] = useState<string[]>([]);
  const focusKey = tasks[0]?.user_id ? `perman:focus:v1:${tasks[0].user_id}` : null;
  const [session, setSession] = useState<{ task: Task; remaining: number; deadline: number | null } | null>(() => {
    if (!focusKey || typeof window === 'undefined') return null;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(focusKey) || 'null');
      const task = tasks.find(t => t.id === saved?.taskId);
      if (!task || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > 86400 || (saved.deadline !== null && !Number.isFinite(saved.deadline))) return null;
      return { task, remaining: saved.remaining, deadline: saved.deadline };
    } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const active = tasks.filter(t => !t.archived_at && t.status !== 'DONE' && t.status !== 'CANCELLED');
  const today = active.filter(t => isTaskDueToday(t.due_date, t.timezone) || isTaskOverdue(t.due_date, t.timezone))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  const completed = tasks.filter(t => t.status === 'DONE' && isTaskDueToday(t.completed_at, t.timezone));
  const reminders = active.filter(t => t.reminder_time && Date.parse(t.reminder_time) >= now && isTaskDueToday(t.reminder_time, t.timezone))
    .sort((a, b) => (a.reminder_time || '').localeCompare(b.reminder_time || ''));
  const candidate = rankNextTasks(tasks, minutes, energy, fits, now).find(t => !skipped.includes(t.id));
  const sessionTask = session ? tasks.find(t => t.id === session.task.id && !t.archived_at && t.status !== 'DONE' && t.status !== 'CANCELLED') : undefined;
  useEffect(() => {
    if (!focusKey) return;
    try {
      if (session && sessionTask) window.sessionStorage.setItem(focusKey, JSON.stringify({ taskId: session.task.id, remaining: session.remaining, deadline: session.deadline }));
      else window.sessionStorage.removeItem(focusKey);
    } catch { /* The timer still works when browser storage is unavailable. */ }
  }, [focusKey, session, sessionTask]);
  const remaining = session ? session.deadline === null ? session.remaining : Math.max(0, Math.ceil((session.deadline - now) / 1000)) : 0;
  const finish = async () => {
    if (!sessionTask || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/tasks/${sessionTask.id}/complete`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not complete the task. Please try again.');
      setSession(null);
      await onRefresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not complete task.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Today and focus" className="grid gap-4 lg:grid-cols-2">
    <div className="memory-panel p-5">
      <h2 className="text-lg font-medium text-zinc-100">Today</h2>
      <p className="mt-1 text-xs text-zinc-400">{completed.length} completed today · {today.length} due or overdue</p>
      <div className="mt-4 space-y-2">{today.slice(0, 4).map(task => <button key={task.id} onClick={() => onEdit(task)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/5 p-3 text-left text-sm text-zinc-200"><span className="truncate">{task.title}</span><span className="shrink-0 text-xs text-amber-300">{isTaskOverdue(task.due_date, task.timezone) ? 'Overdue' : 'Today'}</span></button>)}{!today.length && <p className="py-3 text-sm text-zinc-500">No deadlines need your attention today. Pick a next action.</p>}</div>
      <h3 className="mt-5 text-xs font-medium text-zinc-300">Upcoming reminders today</h3>
      {reminders.slice(0, 3).map(task => <button key={task.id} onClick={() => onEdit(task)} className="mt-2 block w-full truncate text-left text-xs text-zinc-400">{formatTimeOnly(task.reminder_time, task.timezone)} · {task.title}</button>)}
      {!reminders.length && <p className="mt-2 text-xs text-zinc-500">No upcoming task reminders today.</p>}
      <p className="mt-5 text-xs text-zinc-500">Daily wrap-up: {completed.length ? completed.slice(0, 3).map(t => t.title).join(' · ') : 'Your completed tasks will appear here.'}</p>
    </div>
    <div className="memory-panel p-5">
      <h2 className="text-lg font-medium text-zinc-100">Pick my next task</h2>
      {session && sessionTask ? <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-200">{sessionTask.title}</p>
        <p role="timer" aria-label="Focus time remaining" className="text-4xl tabular-nums text-emerald-300">{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</p>
        <p role="status" className="text-xs text-zinc-400">{remaining === 0 ? 'Session finished. Mark the task complete when it is done.' : session.deadline === null ? 'Paused' : 'Focus session running'}</p>
        <div className="flex flex-wrap gap-2">
          {remaining > 0 && <button className={button} onClick={() => setSession({ ...session, remaining, deadline: session.deadline === null ? Date.now() + remaining * 1000 : null })}>{session.deadline === null ? 'Resume' : 'Pause'}</button>}
          <button className={button} disabled={busy} onClick={() => void finish()}>{busy ? 'Saving…' : 'Mark complete'}</button>
          <button className={button} disabled={busy} onClick={() => setSession(null)}>End session</button>
        </div>
        <p className="text-xs text-zinc-500">Your timer resumes when you return in this browser tab. Ending a session leaves the task open.</p>
      </div> : <>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">Available time<select className={select} value={minutes} onChange={e => { setMinutes(Number(e.target.value)); setSkipped([]); }}>{[5, 15, 25, 45, 60].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>
          <label className="text-xs text-zinc-400">My energy<select className={select} value={energy} onChange={e => { setEnergy(e.target.value as Energy); setSkipped([]); }}>{(['LOW', 'MEDIUM', 'HIGH'] as Energy[]).map(n => <option key={n} value={n}>{n.toLowerCase()}</option>)}</select></label>
        </div>
        {candidate ? <div className="mt-4 space-y-3">
          <button onClick={() => onEdit(candidate)} className="text-left text-base font-medium text-zinc-100 hover:underline">{candidate.title}</button>
          <p className="text-xs text-zinc-400">{candidate.priority.toLowerCase()} priority · {candidate.status.toLowerCase()} · {fits[candidate.id]?.minutes && fits[candidate.id]?.energy ? 'Matches your time and energy' : 'Effort unknown — set an estimate below to check fit'}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-400">Task duration<select aria-label="Task duration" disabled={busy || workspace.loading || !!workspace.error} className={select} value={fits[candidate.id]?.minutes ?? ''} onChange={e => { void saveFit(candidate, { ...fits[candidate.id], minutes: e.target.value ? Number(e.target.value) : undefined }); }}><option value="">Unknown</option>{[5, 15, 25, 45, 60, 120].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>
            <label className="text-xs text-zinc-400">Task energy<select aria-label="Task energy" disabled={busy || workspace.loading || !!workspace.error} className={select} value={fits[candidate.id]?.energy ?? ''} onChange={e => { void saveFit(candidate, { ...fits[candidate.id], energy: e.target.value ? e.target.value as Energy : undefined }); }}><option value="">Unknown</option>{(['LOW', 'MEDIUM', 'HIGH'] as Energy[]).map(n => <option key={n} value={n}>{n.toLowerCase()}</option>)}</select></label>
          </div>
          <p className="text-xs text-zinc-500">Estimates are saved to your workspace. Waiting and future scheduled tasks are excluded.</p>
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => { const start = Date.now(); setNow(start); setSession({ task: candidate, remaining: minutes * 60, deadline: start + minutes * 60000 }); }}>Start focus</button><button className={button} onClick={() => setSkipped([...skipped, candidate.id])}>Try another</button></div>
        </div> : <div className="mt-4 space-y-3"><p className="text-sm text-zinc-400">No more tasks match. Adjust your time or energy, or capture a new task.</p>{skipped.length > 0 && <button className={button} onClick={() => setSkipped([])}>Show skipped tasks</button>}</div>}
      </>}
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    </div>
    <div className="memory-panel space-y-4 p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium">Quick notes & routines</h2><Link href="/workspace" className={button}>Open workspace · notes, routines & screenshots</Link></div>
      {workspace.error && <p role="alert" className="text-xs text-red-300">{workspace.error}<button className="ml-2 underline" onClick={() => void workspace.reload()}>Retry</button></p>}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (busy || !note.trim()) return; setBusy(true); setError(''); void workspace.save({ kind: 'NOTE', title: note.trim().slice(0, 100), content: note.trim(), data: {} }).then(() => setNote('')).catch(() => setError('Could not save note. Your text is still here.')).finally(() => setBusy(false)); }}><input aria-label="Quick note" disabled={busy} placeholder="Capture a thought without creating a task…" maxLength={30000} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-zinc-900 p-3 text-sm" value={note} onChange={e => setNote(e.target.value)} /><button disabled={busy || workspace.loading || !!workspace.error || !note.trim()} className={button}>Save note</button></form>
      <div className="flex flex-wrap gap-2">{workspace.items.filter(item => item.kind === 'NOTE').slice(0, 3).map(item => <Link href={`/workspace?item=${item.id}`} key={item.id} className={`${button} max-w-full truncate`}>{item.title}</Link>)}</div>
      <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" disabled={busy || workspace.loading || !!workspace.error} checked={showMotivation} onChange={e => void savePreferences(e.target.checked)} />Show my daily goal and completion streak</label>
      {showMotivation && <div className="space-y-3"><p className="text-sm text-emerald-300">{completed.length >= (preferences?.data.goal || 3) ? 'Daily goal reached!' : `${completed.length} of ${preferences?.data.goal || 3} tasks completed today`} · {completionStreak(tasks, tasks[0]?.timezone || 'Asia/Kolkata')} day streak</p><progress aria-label="Daily completion goal" value={Math.min(completed.length, preferences?.data.goal || 3)} max={preferences?.data.goal || 3} className="w-full accent-emerald-400" /><label className="flex items-center gap-2 text-xs text-zinc-400">Daily goal<select disabled={busy} className="rounded border border-white/15 bg-zinc-900 p-2" value={preferences?.data.goal || 3} onChange={e => void savePreferences(true, Number(e.target.value))}>{[1, 3, 5, 10].map(value => <option key={value} value={value}>{value} tasks</option>)}</select></label></div>}
    </div>
  </section>;
}
