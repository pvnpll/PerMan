'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { formatShortDate, formatTimeOnly, isTaskOverdue, isTaskDueToday } from '@/lib/date';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  Tag,
  Folder,
  ExternalLink,
  MoreVertical,
  Trash2,
  Archive,
  Bell,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onRefresh: () => void;
  onEdit?: (task: Task) => void;
}

export function TaskCard({ task, onRefresh, onEdit }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isDone = task.status === 'DONE';
  const isOverdue = !isDone && isTaskOverdue(task.due_date, task.timezone);
  const isDueToday = !isDone && isTaskDueToday(task.due_date, task.timezone);

  const handleToggleComplete = async () => {
    setLoading(true);
    try {
      if (isDone) {
        // Reopen to INBOX or NEXT
        await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INBOX' }),
        });
      } else {
        await fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' });
      }
      onRefresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}" permanently?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      await fetch(`/api/tasks/${task.id}/archive`, { method: 'POST' });
      onRefresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: 'text-slate-400 bg-slate-800/80 border-slate-700/60',
    MEDIUM: 'text-blue-300 bg-blue-950/70 border-blue-800/60',
    HIGH: 'text-amber-300 bg-amber-950/70 border-amber-800/60',
    URGENT: 'text-red-300 bg-red-950/70 border-red-800/60',
  };

  return (
    <div
      className={`group relative bg-slate-900 border rounded-xl p-4 transition shadow-xs hover:shadow-md ${
        isDone
          ? 'border-slate-800/60 opacity-60 bg-slate-900/40'
          : isOverdue
          ? 'border-red-900/50 hover:border-red-700/60 bg-red-950/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between space-x-3">
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={loading}
          className="mt-0.5 text-slate-500 hover:text-indigo-400 transition cursor-pointer"
        >
          {isDone ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
          <div className="flex items-center space-x-2">
            <h3
              className={`text-sm font-semibold tracking-tight truncate cursor-pointer ${
                isDone ? 'line-through text-slate-400' : 'text-slate-100 hover:text-indigo-300'
              }`}
            >
              {task.title}
            </h3>

            {/* External Link */}
            {task.external_url && (
              <a
                href={task.external_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-slate-500 hover:text-indigo-400 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{task.description}</p>
          )}

          {/* Badges & Meta */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Priority Badge */}
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                priorityColors[task.priority] || priorityColors.MEDIUM
              }`}
            >
              {task.priority}
            </span>

            {/* Status Badge */}
            <span className="text-[10px] font-medium text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
              {task.status}
            </span>

            {/* Due Date */}
            {task.due_date && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center space-x-1 border ${
                  isOverdue
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : isDueToday
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  {isOverdue && '⚠️ Overdue: '}
                  {formatShortDate(task.due_date, task.timezone)}
                </span>
              </span>
            )}

            {/* Reminder Time */}
            {task.reminder_time && (
              <span className="text-[11px] font-medium text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <Bell className="w-3 h-3 text-purple-400" />
                <span>{formatTimeOnly(task.reminder_time, task.timezone)}</span>
              </span>
            )}

            {/* Project Pill */}
            {task.project && (
              <span className="text-[11px] font-medium text-blue-300 bg-blue-950/50 border border-blue-800/50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <Folder className="w-3 h-3 text-blue-400" />
                <span>{task.project.name}</span>
              </span>
            )}

            {/* Category Pill */}
            {task.category && (
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <Tag className="w-3 h-3 text-emerald-400" />
                <span>{task.category.name}</span>
              </span>
            )}

            {/* Merchant */}
            {task.merchant && (
              <span className="text-[11px] font-medium text-pink-300 bg-pink-950/50 border border-pink-800/50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <ShoppingCart className="w-3 h-3 text-pink-400" />
                <span>
                  {task.merchant}
                  {task.estimated_amount !== null && ` ($${task.estimated_amount})`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-20 text-xs text-slate-300"
              onClick={() => setShowMenu(false)}
            >
              <button
                onClick={() => onEdit?.(task)}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center space-x-2"
              >
                <span>Edit Details</span>
              </button>
              <button
                onClick={handleArchive}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center space-x-2 text-slate-400 hover:text-slate-200"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 hover:bg-red-950/50 flex items-center space-x-2 text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
