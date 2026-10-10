import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { Reminder, Task } from '@/lib/types';
import { CreateReminderSchema } from '@/lib/validation';
import { sendTaskReminderNotification } from './notifications.service';
import { addMinutes } from 'date-fns';

export async function createReminder(
  userId: string,
  taskId: string,
  remindAt: string,
  channel: 'EMAIL' | 'PUSH' | 'IN_APP' = 'EMAIL'
): Promise<Reminder> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(PM_TABLES.REMINDERS)
    .insert({
      user_id: userId,
      task_id: taskId,
      remind_at: remindAt,
      status: 'PENDING',
      channel,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating reminder:', error);
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  return data as Reminder;
}

export async function snoozeReminder(
  userId: string,
  reminderId: string,
  minutes: number = 60
): Promise<Reminder> {
  const admin = createAdminClient();

  const snoozedUntil = addMinutes(new Date(), minutes).toISOString();

  // Fetch current reminder to get snooze_count
  const { data: current } = await admin
    .from(PM_TABLES.REMINDERS)
    .select('snooze_count')
    .eq('id', reminderId)
    .eq('user_id', userId)
    .single();

  const newSnoozeCount = (current?.snooze_count || 0) + 1;

  const { data, error } = await admin
    .from(PM_TABLES.REMINDERS)
    .update({
      status: 'SNOOZED',
      snoozed_until: snoozedUntil,
      snooze_count: newSnoozeCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error snoozing reminder:', error);
    throw new Error(`Failed to snooze reminder: ${error.message}`);
  }

  return data as Reminder;
}

export async function dismissReminder(userId: string, reminderId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from(PM_TABLES.REMINDERS)
    .update({
      status: 'DISMISSED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error dismissing reminder:', error);
    throw new Error(`Failed to dismiss reminder: ${error.message}`);
  }

  return true;
}

export async function processDueReminders(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Fetch all pending or snoozed reminders that are due
  const { data: dueReminders, error } = await admin
    .from(PM_TABLES.REMINDERS)
    .select(`
      *,
      task:pm_tasks!task_id(
        *,
        category:pm_categories!category_id(*),
        project:pm_projects!project_id(*)
      )
    `)
    .or(`and(status.eq.PENDING,remind_at.lte.${nowIso}),and(status.eq.SNOOZED,snoozed_until.lte.${nowIso})`);

  if (error) {
    console.error('Error fetching due reminders:', error);
    throw new Error(`Failed to query due reminders: ${error.message}`);
  }

  const reminders = dueReminders || [];
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of reminders) {
    const task = item.task as Task;
    if (!task) {
      // Task was removed or missing, mark reminder as dismissed
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({ status: 'DISMISSED', error_message: 'Associated task not found' })
        .eq('id', item.id);
      continue;
    }

    // Skip if task is already completed or cancelled
    if (task.status === 'DONE' || task.status === 'CANCELLED') {
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({ status: 'DISMISSED', error_message: `Task is ${task.status}` })
        .eq('id', item.id);
      continue;
    }

    // Duplicate delivery prevention via idempotency key
    const idempotencyKey = `rem_${item.id}_snooze${item.snooze_count}_${item.remind_at.slice(0, 16)}`;

    const { data: existingLog } = await admin
      .from(PM_TABLES.NOTIFICATION_LOGS)
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      // Already sent! Mark as SENT to prevent repeated loops
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({ status: 'SENT', updated_at: nowIso })
        .eq('id', item.id);
      continue;
    }

    // Fetch user email from profile
    const { data: profile } = await admin
      .from(PM_TABLES.PROFILES)
      .select('notification_email, email')
      .eq('id', item.user_id)
      .maybeSingle();

    const recipientEmail = profile?.notification_email || profile?.email;

    // Dispatch notification
    const result = await sendTaskReminderNotification(task, recipientEmail);

    if (result.success) {
      // Record success in pm_notification_logs
      await admin.from(PM_TABLES.NOTIFICATION_LOGS).insert({
        user_id: item.user_id,
        reminder_id: item.id,
        task_id: task.id,
        channel: item.channel,
        status: 'SUCCESS',
        attempt_number: (item.snooze_count || 0) + 1,
        idempotency_key: idempotencyKey,
        payload: {
          taskTitle: task.title,
          priority: task.priority,
          due_date: task.due_date,
          recipient: recipientEmail,
        },
        response: result.messageId || 'Delivered',
      });

      // Update reminder status to SENT
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({ status: 'SENT', updated_at: nowIso, error_message: null })
        .eq('id', item.id);

      succeeded++;
    } else {
      // Record failure in pm_notification_logs
      await admin.from(PM_TABLES.NOTIFICATION_LOGS).insert({
        user_id: item.user_id,
        reminder_id: item.id,
        task_id: task.id,
        channel: item.channel,
        status: 'FAILED',
        attempt_number: (item.snooze_count || 0) + 1,
        idempotency_key: idempotencyKey,
        payload: {
          taskTitle: task.title,
          error: result.error,
        },
        response: result.error || 'Failed',
      });

      // Update reminder with error
      await admin
        .from(PM_TABLES.REMINDERS)
        .update({
          status: 'FAILED',
          error_message: result.error || 'Delivery failed',
          updated_at: nowIso,
        })
        .eq('id', item.id);

      failed++;
      errors.push(`Reminder ${item.id}: ${result.error}`);
    }
  }

  return {
    processed: reminders.length,
    succeeded,
    failed,
    errors,
  };
}
