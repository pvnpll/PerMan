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
    LOW: 'text-zinc-500 memory-chip bg-white/[.02]',
    MEDIUM: 'text-zinc-300 memory-chip bg-white/[.03]',
    HIGH: 'text-zinc-100 memory-chip bg-white/[.05]',
    URGENT: 'text-zinc-100 memory-chip bg-white/[.07]',
  };

  return (
    <div
      className={`group relative bg-[#111318] border rounded-xl p-4 transition shadow-none hover:shadow-none ${
        isDone
          ? 'border-white/[.07] opacity-60 bg-white/[.02]'
          : isOverdue
          ? 'border-white/[.07] hover:border-white/20'
          : 'border-white/[.07] hover:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between space-x-3">
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={loading}
          className="mt-0.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          {isDone ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
          <div className="flex items-center space-x-2">
            <h3
              className={`text-sm font-semibold tracking-tight truncate cursor-pointer ${
                isDone ? 'line-through text-zinc-400' : 'text-zinc-100 hover:text-zinc-300'
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
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{task.description}</p>
          )}

          {/* Badges & Meta */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Priority Badge */}
            <span
              className={`text-[10px] uppercase font-medium tracking-widest px-2 py-0.5 ${
                priorityColors[task.priority] || priorityColors.MEDIUM
              }`}
            >
              {task.priority}
            </span>

            {/* Status Badge */}
            <span className="memory-chip text-[10px] text-zinc-500 bg-white/[.02] px-2 py-0.5">
              {task.status}
            </span>

            {/* Due Date */}
            {task.due_date && (
              <span
                className={`memory-chip text-[11px] px-2 py-0.5 flex items-center space-x-1 ${
                  isOverdue
                    ? 'text-zinc-100 bg-white/[.06]'
                    : isDueToday
                    ? 'text-zinc-200 bg-white/[.04]'
                    : 'text-zinc-400 bg-white/[.02]'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  {isOverdue && 'Overdue · '}
                  {formatShortDate(task.due_date, task.timezone)}
                </span>
              </span>
            )}

            {/* Reminder Time */}
            {task.reminder_time && (
              <span className="memory-chip text-[11px] text-zinc-400 bg-white/[.02] px-2 py-0.5 flex items-center space-x-1">
                <Bell className="w-3 h-3" />
                <span>{formatTimeOnly(task.reminder_time, task.timezone)}</span>
              </span>
            )}

            {/* Project Pill */}
            {task.project && (
              <span className="memory-chip text-[11px] text-zinc-400 bg-white/[.02] px-2 py-0.5 flex items-center space-x-1">
                <Folder className="w-3 h-3" />
                <span>{task.project.name}</span>
              </span>
            )}

            {/* Category Pill */}
            {task.category && (
              <span className="memory-chip text-[11px] text-zinc-400 bg-white/[.02] px-2 py-0.5 flex items-center space-x-1">
                <Tag className="w-3 h-3" />
                <span>{task.category.name}{task.subcategory ? ` / ${task.subcategory.name}` : ''}</span>
              </span>
            )}

            {/* Merchant */}
            {task.merchant && (
              <span className="memory-chip text-[11px] text-zinc-400 bg-white/[.02] px-2 py-0.5 flex items-center space-x-1">
                <ShoppingCart className="w-3 h-3" />
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
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/[.06] transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 w-36 bg-[#111318] border border-white/[.07] rounded-xl shadow-xl py-1 z-20 text-xs text-zinc-300"
              onClick={() => setShowMenu(false)}
            >
              <button
                onClick={() => onEdit?.(task)}
                className="w-full text-left px-3 py-2 hover:bg-white/[.06] flex items-center space-x-2"
              >
                <span>Edit Details</span>
              </button>
              <button
                onClick={handleArchive}
                className="w-full text-left px-3 py-2 hover:bg-white/[.06] flex items-center space-x-2 text-zinc-400 hover:text-zinc-200"
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
