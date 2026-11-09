import type { Task } from './types';

export type Energy = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskFit = { minutes?: number; energy?: Energy };
const energyRank = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/** Only recommend actionable commitments; unknown effort remains explicitly unknown. */
export function rankNextTasks(tasks: Task[], minutes: number, energy: Energy, fits: Record<string, TaskFit>, now = Date.now()): Task[] {
  const score = (task: Task) => {
    const due = task.due_date ? Date.parse(task.due_date) : NaN;
    return ({ LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }[task.priority]) * 10
      + (task.status === 'NEXT' ? 15 : 0)
      + (due <= now ? 100 : due <= now + 86400000 ? 50 : 0)
      + (fits[task.id] ? 5 : 0);
  };
  return tasks.filter(task => {
    if (task.archived_at || !['NEXT', 'INBOX', 'SCHEDULED'].includes(task.status)) return false;
    if (task.status === 'SCHEDULED' && task.due_date && Date.parse(task.due_date) > now) return false;
    const fit = fits[task.id];
    return !fit || ((fit.minutes === undefined || fit.minutes <= minutes) && (fit.energy === undefined || energyRank[fit.energy] <= energyRank[energy]));
  }).sort((a, b) => score(b) - score(a) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
