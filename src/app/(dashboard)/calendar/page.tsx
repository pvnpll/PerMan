'use client';

import { useState, useEffect, Suspense } from 'react';
import { Task, Reminder } from '@/lib/types';
import { formatTimeOnly } from '@/lib/date';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { QuickAddModal } from '@/components/tasks/QuickAddModal';
import {
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';

function CalendarContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
    fetchData();
  }, []);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => subMonths(d, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((d) => subDays(d, 7));
    } else {
      setCurrentDate((d) => subDays(d, 1));
      setSelectedDate((d) => subDays(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => addMonths(d, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((d) => addDays(d, 7));
    } else {
      setCurrentDate((d) => addDays(d, 1));
      setSelectedDate((d) => addDays(d, 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Tasks & Reminders for selected date
  const tasksForSelectedDate = tasks.filter((t) => {
    if (!t.due_date) return false;
    return isSameDay(parseISO(t.due_date), selectedDate);
  });

  const remindersForSelectedDate = reminders.filter((r) => {
    if (!r.remind_at) return false;
    return isSameDay(parseISO(r.remind_at), selectedDate);
  });

  const formattedTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const end = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    } else {
      return format(selectedDate, 'EEEE, MMMM d, yyyy');
    }
  };

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
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'month' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Month
          </button>
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

      {/* Navigation Controls Bar */}
      <div className="bg-[#111318] border border-white/[.07] rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous"
            className="p-1.5 rounded-lg border border-white/[.07] text-zinc-400 hover:text-zinc-100 hover:bg-white/[.06] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next"
            className="p-1.5 rounded-lg border border-white/[.07] text-zinc-400 hover:text-zinc-100 hover:bg-white/[.06] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-white/[.07] text-zinc-300 hover:text-white hover:bg-white/[.06] transition"
          >
            Today
          </button>
        </div>

        <div className="text-sm font-semibold text-zinc-100">
          {formattedTitle()}
        </div>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="bg-[#111318] border border-white/[.07] rounded-xl p-4 shadow-none space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-500 uppercase pb-1 border-b border-white/[.07]">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrMonth = isSameMonth(day, currentDate);
              const dayTasks = tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));
              const dayReminders = reminders.filter((r) => r.remind_at && isSameDay(parseISO(r.remind_at), day));

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[64px] sm:min-h-[80px] p-1.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-white/25 bg-white/[.06]'
                      : isCurrMonth
                      ? 'bg-[#0c0e12] border-white/[.05] hover:border-white/10'
                      : 'bg-transparent border-transparent opacity-30 hover:opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday(day)
                          ? 'bg-zinc-200 text-zinc-900 font-bold'
                          : isSelected
                          ? 'text-zinc-100'
                          : 'text-zinc-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {(dayTasks.length > 0 || dayReminders.length > 0) && (
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        {dayTasks.length > 0 && `${dayTasks.length}t`}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className="text-[9px] truncate px-1 py-0.5 rounded bg-white/[.04] text-zinc-300"
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] text-zinc-500 pl-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day Week Strip */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const dayTasks = tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`p-1.5 sm:p-3 rounded-xl border text-center transition flex flex-col items-center cursor-pointer ${
                  isSelected
                    ? 'border-white/25 bg-white/[.06] shadow-none'
                    : 'bg-[#111318] border-white/[.07] hover:border-white/10'
                }`}
              >
                <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-400 uppercase truncate">
                  {isToday(day) ? 'Today' : format(day, 'EEE')}
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium my-1 ${
                    isSelected ? 'text-zinc-100 font-bold' : 'text-zinc-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-white/[.08] text-zinc-300 mt-0.5">
                    {dayTasks.length}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Day View Details */}
      <div className="bg-[#111318] border border-white/[.07] rounded-xl p-4 sm:p-6 shadow-none space-y-6">
        <div className="border-b border-white/[.07] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div>
            <div className="font-bold text-base text-zinc-100">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {tasksForSelectedDate.length} deadline{tasksForSelectedDate.length === 1 ? '' : 's'}, {remindersForSelectedDate.length} reminder{remindersForSelectedDate.length === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="self-start sm:self-auto text-xs text-zinc-300 hover:text-white flex items-center space-x-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task for this date</span>
          </button>
        </div>

        {/* Reminders section for this day */}
        {remindersForSelectedDate.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Bell className="w-3.5 h-3.5" />
              <span>Scheduled Reminders</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {remindersForSelectedDate.map((r) => (
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
          ) : tasksForSelectedDate.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/[.07] rounded-xl">
              No tasks due on this date.
            </div>
          ) : (
            <div className="space-y-2">
              {tasksForSelectedDate.map((task) => (
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

      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={fetchData}
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
