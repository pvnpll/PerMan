import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Task, TaskStatus, TaskPriority, TaskSource } from '@/lib/types';
import { CreateTaskInput, UpdateTaskInput, SearchTasksInput } from '@/lib/validation';
import { isTaskOverdue, isTaskDueToday, DEFAULT_TIMEZONE } from '@/lib/date';
import { addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';

export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const admin = createAdminClient();

  // If status is DONE at creation, set completed_at
  const completed_at = input.status === 'DONE' ? new Date().toISOString() : null;

  const { data: task, error } = await admin
    .from(PM_TABLES.TASKS)
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      category_id: input.category_id || null,
      subcategory_id: input.subcategory_id || null,
      project_id: input.project_id || null,
      status: input.status || 'INBOX',
      priority: input.priority || 'MEDIUM',
      due_date: input.due_date || null,
      reminder_time: input.reminder_time || null,
      timezone: input.timezone || DEFAULT_TIMEZONE,
      completed_at,
      recurrence_rule: input.recurrence_rule || null,
      source: input.source || 'APP',
      external_url: input.external_url || null,
      merchant: input.merchant || null,
      estimated_amount: input.estimated_amount ?? null,
    })
    .select(`
      *,
      category:pm_categories!category_id(*),
      subcategory:pm_categories!subcategory_id(*),
      project:pm_projects!project_id(*)
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }

  // If reminder_time is provided, create a pending reminder record
  if (input.reminder_time) {
    await admin.from(PM_TABLES.REMINDERS).insert({
      user_id: userId,
      task_id: task.id,
      remind_at: input.reminder_time,
      status: 'PENDING',
      channel: 'EMAIL',
    });
  }

  return task as Task;
}

export async function getTasks(
  userId: string,
  filter: SearchTasksInput = { archived: false, limit: 50, offset: 0, sort_by: 'created_at', sort_direction: 'desc' }
): Promise<{ tasks: Task[]; total: number }> {
  const admin = createAdminClient();

  let query = admin
    .from(PM_TABLES.TASKS)
    .select(
      `
      *,
      category:pm_categories!category_id(*),
      subcategory:pm_categories!subcategory_id(*),
      project:pm_projects!project_id(*)
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  // Archive filter
  if (filter.archived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null);
  }

  // Status
  if (filter.status) {
    query = query.eq('status', filter.status);
  }

  // Priority
  if (filter.priority) {
    query = query.eq('priority', filter.priority);
  }

  // Category & Project
  if (filter.category_id) {
    query = query.or(`category_id.eq.${filter.category_id},subcategory_id.eq.${filter.category_id}`);
  }
  if (filter.subcategory_id) {
    query = query.eq('subcategory_id', filter.subcategory_id);
  }
  if (filter.project_id) {
    query = query.eq('project_id', filter.project_id);
  }

  // Search keyword in title or description
  if (filter.query && filter.query.trim()) {
    const term = filter.query.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,merchant.ilike.%${term}%`);
  }

  // Date filters
  const nowIso = new Date().toISOString();
  if (filter.due_date === 'overdue') {
    query = query
      .not('due_date', 'is', null)
      .lt('due_date', nowIso)
      .not('status', 'in', '("DONE","CANCELLED")');
  } else if (filter.due_date === 'upcoming') {
    query = query
      .not('due_date', 'is', null)
      .gte('due_date', nowIso);
  }

  // Sorting
  const sortCol = filter.sort_by || 'created_at';
  const ascending = filter.sort_direction === 'asc';
  query = query.order(sortCol, { ascending });

  // Pagination
  const limit = filter.limit || 50;
  const offset = filter.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return {
    tasks: (data || []) as Task[],
    total: count || 0,
  };
}

export async function getTaskById(userId: string, taskId: string): Promise<Task | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(PM_TABLES.TASKS)
    .select(`
      *,
      category:pm_categories!category_id(*),
      subcategory:pm_categories!subcategory_id(*),
      project:pm_projects!project_id(*)
    `)
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const admin = createAdminClient();

  const payload: any = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.category_id !== undefined) payload.category_id = input.category_id;
  if (input.subcategory_id !== undefined) payload.subcategory_id = input.subcategory_id;
  if (input.project_id !== undefined) payload.project_id = input.project_id;
  if (input.status !== undefined) {
    payload.status = input.status;
    if (input.status === 'DONE' && !input.completed_at) {
      payload.completed_at = new Date().toISOString();
    } else if (input.status !== 'DONE' && input.completed_at === undefined) {
      payload.completed_at = null;
    }
  }
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.reminder_time !== undefined) payload.reminder_time = input.reminder_time;
  if (input.timezone !== undefined) payload.timezone = input.timezone;
  if (input.recurrence_rule !== undefined) payload.recurrence_rule = input.recurrence_rule;
  if (input.external_url !== undefined) payload.external_url = input.external_url;
  if (input.merchant !== undefined) payload.merchant = input.merchant;
  if (input.estimated_amount !== undefined) payload.estimated_amount = input.estimated_amount;
  if (input.completed_at !== undefined) payload.completed_at = input.completed_at;
  if (input.archived_at !== undefined) payload.archived_at = input.archived_at;

  const { data: updated, error } = await admin
    .from(PM_TABLES.TASKS)
    .update(payload)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select(`
      *,
      category:pm_categories!category_id(*),
      subcategory:pm_categories!subcategory_id(*),
      project:pm_projects!project_id(*)
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }

  if (input.reminder_time === null) {
    const { error: reminderError } = await admin.from(PM_TABLES.REMINDERS)
      .update({ status: 'DISMISSED', updated_at: new Date().toISOString() })
      .eq('task_id', taskId).eq('user_id', userId).in('status', ['PENDING', 'SNOOZED']);
    if (reminderError) throw new Error(`Task updated but reminder cancellation failed: ${reminderError.message}`);
  }

  // Update or insert reminder if reminder_time changed
  if (input.reminder_time) {
    const { data: existingReminders } = await admin
      .from(PM_TABLES.REMINDERS)
      .select('id')
      .eq('task_id', taskId)
      .eq('status', 'PENDING');

    if (existingReminders && existingReminders.length > 0) {
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({ remind_at: input.reminder_time, updated_at: new Date().toISOString() })
        .eq('id', existingReminders[0].id);
    } else {
      await admin.from(PM_TABLES.REMINDERS).insert({
        user_id: userId,
        task_id: taskId,
        remind_at: input.reminder_time,
        status: 'PENDING',
        channel: 'EMAIL',
      });
    }
  }

  return updated as Task;
}

export async function completeTask(userId: string, taskId: string): Promise<Task> {
  const current = await getTaskById(userId, taskId);
  if (!current) {
    throw new Error('Task not found');
  }

  const completed = await updateTask(userId, taskId, {
    status: 'DONE',
    completed_at: new Date().toISOString(),
  });

  // Handle recurring task: schedule next instance if recurrence rule is configured
  if (current.recurrence_rule && current.due_date) {
    await createNextRecurringInstance(userId, current);
  }

  return completed;
}

export async function archiveTask(userId: string, taskId: string): Promise<Task> {
  return updateTask(userId, taskId, {
    archived_at: new Date().toISOString(),
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from(PM_TABLES.TASKS)
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return true;
}

export async function getDailySummary(
  userId: string,
  tz: string = DEFAULT_TIMEZONE
): Promise<{
  overdue: Task[];
  dueToday: Task[];
  completedToday: Task[];
  highPriority: Task[];
  upcoming: Task[];
  stats: {
    overdueCount: number;
    dueTodayCount: number;
    completedTodayCount: number;
    highPriorityCount: number;
    inboxCount: number;
  };
}> {
  const admin = createAdminClient();

  const { data: allActiveTasks } = await admin
    .from(PM_TABLES.TASKS)
    .select(`
      *,
      category:pm_categories!category_id(*),
      subcategory:pm_categories!subcategory_id(*),
      project:pm_projects!project_id(*)
    `)
    .eq('user_id', userId)
    .is('archived_at', null);

  const tasks = (allActiveTasks || []) as Task[];

  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const completedToday: Task[] = [];
  const highPriority: Task[] = [];
  const upcoming: Task[] = [];
  let inboxCount = 0;

  tasks.forEach((t) => {
    if (t.status === 'INBOX') inboxCount++;

    if (t.status === 'DONE') {
      if (t.completed_at && isTaskDueToday(t.completed_at, tz)) {
        completedToday.push(t);
      }
      return;
    }

    if (t.status === 'CANCELLED') return;

    if (t.priority === 'HIGH' || t.priority === 'URGENT') {
      highPriority.push(t);
    }

    if (t.due_date) {
      if (isTaskDueToday(t.due_date, tz)) {
        dueToday.push(t);
      } else if (isTaskOverdue(t.due_date, tz)) {
        overdue.push(t);
      } else {
        upcoming.push(t);
      }
    }
  });

  return {
    overdue,
    dueToday,
    completedToday,
    highPriority,
    upcoming,
    stats: {
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      completedTodayCount: completedToday.length,
      highPriorityCount: highPriority.length,
      inboxCount,
    },
  };
}

async function createNextRecurringInstance(userId: string, parentTask: Task) {
  const rule = parentTask.recurrence_rule;
  if (!rule || !parentTask.due_date) return;

  const currentDue = parseISO(parentTask.due_date);
  const interval = rule.interval || 1;
  let nextDue: Date;

  switch (rule.frequency) {
    case 'DAILY':
      nextDue = addDays(currentDue, interval);
      break;
    case 'WEEKLY':
      nextDue = addWeeks(currentDue, interval);
      break;
    case 'MONTHLY':
      nextDue = addMonths(currentDue, interval);
      break;
    case 'YEARLY':
      nextDue = addYears(currentDue, interval);
      break;
    default:
      nextDue = addDays(currentDue, interval);
  }

  let nextReminder: string | null = null;
  if (parentTask.reminder_time) {
    const currentRemind = parseISO(parentTask.reminder_time);
    let nextRemindDate: Date;
    switch (rule.frequency) {
      case 'DAILY':
        nextRemindDate = addDays(currentRemind, interval);
        break;
      case 'WEEKLY':
        nextRemindDate = addWeeks(currentRemind, interval);
        break;
      case 'MONTHLY':
        nextRemindDate = addMonths(currentRemind, interval);
        break;
      case 'YEARLY':
        nextRemindDate = addYears(currentRemind, interval);
        break;
      default:
        nextRemindDate = addDays(currentRemind, interval);
    }
    nextReminder = nextRemindDate.toISOString();
  }

  await createTask(userId, {
    title: parentTask.title,
    description: parentTask.description,
    category_id: parentTask.category_id,
    subcategory_id: parentTask.subcategory_id,
    project_id: parentTask.project_id,
    status: 'SCHEDULED',
    priority: parentTask.priority,
    due_date: nextDue.toISOString(),
    reminder_time: nextReminder,
    timezone: parentTask.timezone,
    recurrence_rule: rule,
    source: parentTask.source,
    merchant: parentTask.merchant,
    estimated_amount: parentTask.estimated_amount ?? undefined,
  });
}
