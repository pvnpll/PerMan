import { Task } from '@/lib/types';
import { formatUserDate } from '@/lib/date';

export interface NotificationPayload {
  toEmail?: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  categoryName?: string;
  projectName?: string;
  dueFormatted?: string;
  taskUrl: string;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

export async function sendTaskReminderNotification(
  task: Task,
  recipientEmail?: string | null
): Promise<NotificationResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const taskUrl = `${appUrl}/tasks?id=${task.id}`;

  const payload: NotificationPayload = {
    toEmail: recipientEmail || undefined,
    taskTitle: task.title,
    taskDescription: task.description,
    priority: task.priority,
    categoryName: task.category?.name,
    projectName: task.project?.name,
    dueFormatted: task.due_date ? formatUserDate(task.due_date, task.timezone) : undefined,
    taskUrl,
  };

  const provider = process.env.NOTIFICATION_PROVIDER || 'console';

  if (provider === 'resend' && process.env.RESEND_API_KEY && payload.toEmail) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_FROM_EMAIL || 'notifications@perman.app',
          to: payload.toEmail,
          subject: `⏰ PerMan Reminder: ${payload.taskTitle} [${payload.priority}]`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #111827; margin-bottom: 8px;">⏰ Task Reminder</h2>
              <h3 style="color: #2563eb; margin-top: 0;">${payload.taskTitle}</h3>
              ${payload.taskDescription ? `<p style="color: #4b5563;">${payload.taskDescription}</p>` : ''}
              <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Priority:</strong> ${payload.priority}</p>
                ${payload.categoryName ? `<p style="margin: 4px 0;"><strong>Category:</strong> ${payload.categoryName}</p>` : ''}
                ${payload.projectName ? `<p style="margin: 4px 0;"><strong>Project:</strong> ${payload.projectName}</p>` : ''}
                ${payload.dueFormatted ? `<p style="margin: 4px 0;"><strong>Due Date:</strong> ${payload.dueFormatted}</p>` : ''}
              </div>
              <a href="${payload.taskUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in PerMan</a>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return { success: false, channel: 'EMAIL', error: errorData };
      }

      const resData = await response.json();
      return { success: true, channel: 'EMAIL', messageId: resData.id };
    } catch (err: any) {
      return { success: false, channel: 'EMAIL', error: err.message };
    }
  }

  // Default fallback: Structured Console Notification & Delivery Log
  console.log(`\n======================================================`);
  console.log(`🔔 [PerMan Scheduled Reminder Dispatched]`);
  console.log(`📬 To: ${payload.toEmail || 'User'}`);
  console.log(`📌 Task: ${payload.taskTitle} [Priority: ${payload.priority}]`);
  if (payload.dueFormatted) console.log(`📅 Due: ${payload.dueFormatted}`);
  if (payload.categoryName) console.log(`🏷️ Category: ${payload.categoryName}`);
  if (payload.projectName) console.log(`🚀 Project: ${payload.projectName}`);
  console.log(`🔗 Link: ${payload.taskUrl}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    channel: 'EMAIL',
    messageId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}
