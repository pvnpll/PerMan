import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'INBOX',
  'NEXT',
  'SCHEDULED',
  'WAITING',
  'DONE',
  'CANCELLED',
]);

export const TaskPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

export const TaskSourceSchema = z.enum([
  'APP',
  'MCP',
  'SHORTCUT',
  'API',
]);

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  subcategory_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  status: TaskStatusSchema.default('INBOX'),
  priority: TaskPrioritySchema.default('MEDIUM'),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  reminder_time: z.string().datetime({ offset: true }).optional().nullable(),
  timezone: z.string().default('Asia/Kolkata'),
  recurrence_rule: z.record(z.string(), z.any()).optional().nullable(),
  source: TaskSourceSchema.default('APP'),
  external_url: z.string().url().optional().nullable().or(z.literal('')),
  merchant: z.string().optional().nullable(),
  estimated_amount: z.number().min(0).optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  timezone: z.string().optional(),
  source: TaskSourceSchema.optional(),
  completed_at: z.string().datetime({ offset: true }).optional().nullable(),
  archived_at: z.string().datetime({ offset: true }).optional().nullable(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  sort_order: z.number().int().optional(),
  is_archived: z.boolean().optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  category_id: z.string().uuid().optional().nullable(),
  target_date: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
});

export const CreateReminderSchema = z.object({
  task_id: z.string().uuid(),
  remind_at: z.string().datetime({ offset: true }),
  channel: z.enum(['EMAIL', 'PUSH', 'IN_APP']).default('EMAIL'),
});

export const SnoozeReminderSchema = z.object({
  minutes: z.number().int().min(1).max(43200).default(60), // default 1 hour
});

export const SearchTasksSchema = z.object({
  query: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  category_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  due_date: z.string().optional(), // 'today', 'overdue', 'upcoming', or YYYY-MM-DD
  archived: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['due_date', 'priority', 'created_at', 'title']).default('created_at'),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
