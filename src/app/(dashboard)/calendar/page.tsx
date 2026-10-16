'use client';

import { useState, useEffect, Suspense } from 'react';
import { Task, Reminder } from '@/lib/types';
import { formatShortDate, formatTimeOnly } from '@/lib/date';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { Calendar as CalendarIcon, Clock, Bell, Loader2 } from 'lucide-react';
import { addDays, format, isSameDay, parseISO } from 'date-fns';

function CalendarContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const [tasksRes, remRes] = await Promise.all([
        fetch('/api/tasks?limit=100').then((r) => r.json()),
        fetch('/api/reminders').then((r) => r.json()),
      ]);
      setTasks(tasksRes.tasks || []);
      setReminders(remRes.reminders || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setToday(new Date());
    fetchData();
  }, []);

  if (!today) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        <span className="text-xs">Initializing timeline...</span>
      </div>
    );
  }

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const activeDate = addDays(today, selectedDayOffset);

  // Group tasks by day
  const tasksForActiveDate = tasks.filter((t) => {
    if (!t.due_date) return false;
    return isSameDay(parseISO(t.due_date), activeDate);
  });

  const remindersForActiveDate = reminders.filter((r) => {
    if (!r.remind_at) return false;
    return isSameDay(parseISO(r.remind_at), activeDate);
  });

  return (
    <div className="memory-home space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="memory-eyebrow">Timeline</p>
          <h1 className="memory-title mt-3">Calendar & Upcoming</h1>
          <p className="memory-subtitle">
            Visualize your scheduled commitments, deadlines, and notification alerts.
          </p>
        </div>

        {/* View Switcher */}
        <div className="memory-panel flex items-center p-1 self-start">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'week' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            7-Day Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'day' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Single Day
          </button>
        </div>
      </div>

      {/* Week Day Pills */}
      <div className="grid grid-cols-7 gap-2">
        {next7Days.map((day, idx) => {
          const isSelected = selectedDayOffset === idx;
          const dayTasks = tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDayOffset(idx)}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center cursor-pointer ${
                isSelected
                  ? 'border-white/[.07] bg-white/[.04] border-white/10 shadow-none '
                  : 'bg-[#111318] border-white/[.07] hover:border-white/10'
              }`}
            >
              <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                {idx === 0 ? 'Today' : format(day, 'EEE')}
              </span>
              <span
                className={`text-sm font-medium my-1 ${
                  isSelected ? 'text-zinc-300' : 'text-zinc-100'
                }`}
              >
                {format(day, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day View */}
      <div className="bg-[#111318] border border-white/[.07] rounded-xl p-6 shadow-none space-y-6">
        <div className="border-b border-white/[.07] pb-3 flex items-center justify-between">
          <div className="font-bold text-base text-zinc-100">
            {format(activeDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            {tasksForActiveDate.length} deadline{tasksForActiveDate.length === 1 ? '' : 's'}, {remindersForActiveDate.length} reminder{remindersForActiveDate.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Reminders section for this day */}
        {remindersForActiveDate.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Bell className="w-3.5 h-3.5" />
              <span>Scheduled Reminders</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {remindersForActiveDate.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#0c0e12] border border-white/[.07] rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {r.task?.title || 'Reminder Alert'}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeOnly(r.remind_at)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] memory-chip text-zinc-400 bg-white/[.03] px-2 py-0.5 font-semibold">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks for this day */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-300" />
            <span>Tasks Due on this Date</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading calendar...</span>
            </div>
          ) : tasksForActiveDate.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/[.07] rounded-xl">
              No tasks due on this date.
            </div>
          ) : (
            <div className="space-y-2">
              {tasksForActiveDate.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onRefresh={fetchData}
                  onEdit={(t) => setEditingTask(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onTaskUpdated={fetchData}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500 text-sm">Loading calendar...</div>}>
      <CalendarContent />
    </Suspense>
  );
}
