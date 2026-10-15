/**
 * PerMan Domain & Database Types
 */

export type TaskStatus = 'INBOX' | 'NEXT' | 'SCHEDULED' | 'WAITING' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskSource = 'APP' | 'MCP' | 'SHORTCUT' | 'API';

export type ReminderStatus = 'PENDING' | 'SENT' | 'SNOOZED' | 'DISMISSED' | 'FAILED';
export type ReminderChannel = 'EMAIL' | 'PUSH' | 'IN_APP';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  timezone: string;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: Category[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: ProjectStatus;
  category_id: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_count?: number;
}

export interface RecurrenceRule {
  id: string;
  user_id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  days_of_week: number[] | null;
  day_of_month: number | null;
  end_date: string | null;
  count: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  project_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  reminder_time: string | null;
  timezone: string;
  completed_at: string | null;
  recurrence_id: string | null;
  recurrence_rule: any | null;
  source: TaskSource;
  external_url: string | null;
  merchant: string | null;
  estimated_amount: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Joined fields
  category?: Category | null;
  subcategory?: Category | null;
  project?: Project | null;
}

export interface Reminder {
  id: string;
  user_id: string;
  task_id: string;
  remind_at: string;
  status: ReminderStatus;
  snooze_count: number;
  snoozed_until: string | null;
  channel: ReminderChannel;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  task?: Task | null;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  reminder_id: string | null;
  task_id: string | null;
  channel: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  attempt_number: number;
  idempotency_key: string | null;
  payload: any;
  response: string | null;
  sent_at: string;
}

export interface ParsedTaskInput {
  title: string;
  categoryName?: string;
  projectName?: string;
  priority?: TaskPriority;
  dueDate?: string;
  reminderTime?: string;
  recurrenceRule?: {
    frequency: RecurrenceFrequency;
    interval?: number;
  };
  merchant?: string;
  estimatedAmount?: number;
  url?: string;
  source?: TaskSource;
  status?: TaskStatus;
}
