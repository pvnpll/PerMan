import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as tasksService from '@/lib/services/tasks.service';
import * as categoriesService from '@/lib/services/categories.service';
import * as projectsService from '@/lib/services/projects.service';
import * as remindersService from '@/lib/services/reminders.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
import { organizeTask } from '@/lib/services/task-organization.service';
import { UpdateTaskSchema, CreateProjectSchema, UpdateProjectSchema, UpdateCategorySchema, SearchTasksSchema } from '@/lib/validation';
import { resolveTaskOrganizationUpdate } from '@/lib/services/mcp-organization.service';
import { parseNaturalLanguageTask } from '@/lib/nlp-parser';

export interface McpAuthInfo {
  token: string;
  userId: string;
  clientId: string;
  clientName: string;
  timezone?: string;
  scopes?: string[];
  [key: string]: any;
}

export function createPerManMcpServer(authInfo: McpAuthInfo) {
  const server = new McpServer({
    name: 'perman-mcp',
    version: '1.0.0',
  });

  const userId = authInfo.userId;
  const userTz = authInfo.timezone || 'Asia/Kolkata';

  // Helper for text responses
  const jsonResponse = (data: any) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  });

  // 1. tool: create_task
  server.tool(
    'create_task',
    'Create a new personal management task in PerMan. Act as personal memory: infer a suitable category and subcategory from the conversation and pass their names. For project work pass project_name; missing categories and projects are created automatically. Preserve full ticket details, acceptance criteria, and next steps in description. Supports raw natural language capture.',
    {
      title: z.string().describe('The task title or quick-add text (e.g. "Buy headphones from Amazon next month")'),
      description: z.string().optional().describe('Optional detailed notes or description'),
      category_name: z.string().trim().min(1).max(100).optional().describe('AI-chosen life area. Defaults to Projects for project work, otherwise Personal.'),
      subcategory_name: z.string().trim().min(1).max(100).optional().describe('AI-chosen subgroup, e.g. Health, Finances, Shopping. Created automatically. For project tasks the project name is the subgroup.'),
      project_name: z.string().trim().min(1).max(100).optional().describe('Optional project name (e.g. "Calflow", "Rimev", "Klay")'),
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      due_date: z.string().optional().describe('ISO 8601 due date string'),
      reminder_time: z.string().optional().describe('ISO 8601 reminder time string'),
      merchant: z.string().optional().describe('Merchant or vendor (e.g. Amazon, Flipkart)'),
      estimated_amount: z.number().optional().describe('Estimated purchase amount'),
      url: z.string().optional().describe('Optional related URL'),
      idempotency_key: z.string().optional().describe('Optional unique key to prevent accidental duplicate creation'),
    },
    async (args) => {
      const admin = createAdminClient();

      // Check idempotency if key provided
      if (args.idempotency_key) {
        const { data: cached } = await admin
          .from(PM_TABLES.MCP_IDEMPOTENCY_KEYS)
          .select('result')
          .eq('id', args.idempotency_key)
          .eq('user_id', userId)
          .maybeSingle();

        if (cached?.result) {
          return jsonResponse({
            cached: true,
            message: 'Task retrieved from previous idempotent request',
            task: cached.result,
          });
        }
      }

      // If user input contains natural language clues, enrich with parser
      const parsed = parseNaturalLanguageTask(args.title, userTz);

      const projectName = args.project_name || parsed.projectName;
      const organization = await organizeTask(userId, {
        categoryName: args.category_name || (projectName ? 'Projects' : 'Personal'),
        subcategoryName: args.subcategory_name || (!projectName ? parsed.categoryName : undefined),
        projectName,
      });

      const task = await tasksService.createTask(userId, {
        title: parsed.title || args.title,
        description: args.description,
        ...organization,
        status: args.status || parsed.status || 'INBOX',
        priority: (args.priority || parsed.priority || 'MEDIUM') as any,
        due_date: args.due_date || parsed.dueDate || null,
        reminder_time: args.reminder_time || parsed.reminderTime || null,
        timezone: userTz,
        recurrence_rule: parsed.recurrenceRule || null,
        source: 'MCP',
        external_url: args.url || parsed.url || null,
        merchant: args.merchant || parsed.merchant || null,
        estimated_amount: args.estimated_amount ?? parsed.estimatedAmount ?? null,
      });

      // Save idempotency key if provided
      if (args.idempotency_key) {
        await admin.from(PM_TABLES.MCP_IDEMPOTENCY_KEYS).insert({
          id: args.idempotency_key,
          user_id: userId,
          action: 'create_task',
          result: task,
        });
      }

      return jsonResponse({
        success: true,
        message: `Task "${task.title}" created successfully in PerMan`,
        task,
      });
    }
  );

  // 2. tool: search_tasks
  server.tool(
    'search_tasks',
    'Search PerMan tasks by keyword, status, priority, or due date range',
    {
      query: z.string().optional().describe('Keyword search in title, description, or merchant'),
      category_id: z.string().uuid().optional().describe('Category or subcategory UUID from list_categories'),
      project_id: z.string().uuid().optional().describe('Project UUID from get_projects'),
      offset: z.number().int().min(0).optional().default(0),
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      due_date: z.enum(['today', 'overdue', 'upcoming']).optional(),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    async (args) => {
      const res = await tasksService.getTasks(userId, {
        query: args.query,
        category_id: args.category_id,
        project_id: args.project_id,
        status: args.status,
        priority: args.priority,
        due_date: args.due_date,
        limit: args.limit || 20,
        offset: args.offset,
        archived: false,
        sort_by: 'created_at',
        sort_direction: 'desc',
      });

      return jsonResponse({
        count: res.tasks.length,
        total: res.total,
        tasks: res.tasks,
      });
    }
  );

  // 3. tool: get_tasks
  server.tool(
    'get_tasks',
    'Get tasks, including next actions for a project or category; use get_projects or list_categories for IDs',
    SearchTasksSchema.shape,
    async (args) => {
      const res = await tasksService.getTasks(userId, args);

      return jsonResponse(res);
    }
  );

  // 4. tool: get_task
  server.tool(
    'get_task',
    'Get details of a specific PerMan task by UUID',
    {
      task_id: z.string().uuid().describe('The UUID of the task'),
    },
    async (args) => {
      const task = await tasksService.getTaskById(userId, args.task_id);
      if (!task) {
        return jsonResponse({ error: 'Task not found or access denied' });
      }
      return jsonResponse({ task });
    }
  );

  // 5. tool: update_task
  server.tool(
    'update_task',
    'Update any task details and organization. Assign category_name and subcategory_name (for example Shopping & Purchases / Fitness & Nutrition), or project_name; missing names are created. Alternatively use owned UUIDs. Omitted fields are preserved; null clears a nullable field. archived_at=null restores a task; an ISO timestamp archives it.',
    {
      ...UpdateTaskSchema.omit({ source: true }).shape,
      task_id: z.string().uuid(),
      category_name: z.string().trim().min(1).max(100).optional(),
      subcategory_name: z.string().trim().min(1).max(100).nullable().optional(),
      project_name: z.string().trim().min(1).max(100).nullable().optional(),
    },
    async (args) => {
      const { task_id, category_name, subcategory_name, project_name, ...fields } = args;
      const current = await tasksService.getTaskById(userId, task_id);
      if (!current) throw new Error('Task not found or access denied');
      const organization = await resolveTaskOrganizationUpdate(userId, current, {
        ...fields, category_name, subcategory_name, project_name,
      });
      const updated = await tasksService.updateTask(userId, task_id, { ...fields, ...organization });

      return jsonResponse({
        success: true,
        message: `Task "${updated.title}" updated`,
        task: updated,
      });
    }
  );

  // 6. tool: complete_task
  server.tool(
    'complete_task',
    'Mark a task as completed in PerMan',
    {
      task_id: z.string().uuid().describe('The task UUID to mark complete'),
    },
    async (args) => {
      const completed = await tasksService.completeTask(userId, args.task_id);
      return jsonResponse({
        success: true,
        message: `Task "${completed.title}" marked as completed!`,
        task: completed,
      });
    }
  );

  // 7. tool: delete_task
  server.tool(
    'delete_task',
    'Permanently delete a task from PerMan',
    {
      task_id: z.string().uuid().describe('The task UUID to delete'),
    },
    async (args) => {
      await tasksService.deleteTask(userId, args.task_id);
      return jsonResponse({
        success: true,
        message: `Task ${args.task_id} deleted permanently`,
      });
    }
  );

  // 8. tool: list_categories
  server.tool(
    'list_categories',
    'List all user categories and subcategories in PerMan',
    {},
    async () => {
      const categories = await categoriesService.getCategories(userId);
      return jsonResponse({ categories });
    }
  );

  // 9. tool: create_category
  server.tool(
    'create_category',
    'Create a new category or subcategory in PerMan',
    {
      name: z.string().describe('Category name'),
      parent_category_name: z.string().optional().describe('Optional parent category name if creating a subcategory'),
    },
    async (args) => {
      let parentId: string | null = null;
      if (args.parent_category_name) {
        const parent = (await categoriesService.getCategories(userId)).find(category =>
          !category.is_archived && category.name.trim().toLowerCase() === args.parent_category_name!.trim().toLowerCase()
        );
        const resolved = parent || await categoriesService.createCategory(userId, {
          name: args.parent_category_name, sort_order: 0,
        });
        parentId = resolved.id;
      }

      const created = await categoriesService.createCategory(userId, {
        name: args.name,
        parent_id: parentId,
        sort_order: 0,
      });

      return jsonResponse({
        success: true,
        message: `Category "${created.name}" created`,
        category: created,
      });
    }
  );

  // 10. tool: get_projects
  server.tool(
    'get_projects',
    'List all projects with task counts and progress indicators',
    {},
    async () => {
      const projects = await projectsService.getProjects(userId);
      return jsonResponse({ projects });
    }
  );

  // 11. tool: create_reminder
  server.tool(
    'create_reminder',
    'Schedule a reminder for a specific task',
    {
      task_id: z.string().uuid().describe('Task UUID'),
      remind_at: z.string().describe('ISO 8601 timestamp for the reminder'),
    },
    async (args) => {
      if (!await tasksService.getTaskById(userId, args.task_id)) throw new Error('Task not found or access denied');
      const reminder = await remindersService.createReminder(
        userId,
        args.task_id,
        args.remind_at,
        'EMAIL'
      );
      return jsonResponse({
        success: true,
        message: 'Reminder scheduled successfully',
        reminder,
      });
    }
  );

  // 12. tool: get_daily_summary
  server.tool(
    'get_daily_summary',
    'Get today’s summary including overdue tasks, tasks due today, completed count, and upcoming deadlines',
    {},
    async () => {
      const summary = await tasksService.getDailySummary(userId, userTz);
      return jsonResponse(summary);
    }
  );

  server.tool('update_category', 'Rename, style, reorder, archive or restore a category or subcategory. Tasks retain their assignments.', {
    category_id: z.string().uuid(), ...UpdateCategorySchema.omit({ parent_id: true }).shape,
  }, async ({ category_id, ...fields }) => jsonResponse({ category: await categoriesService.updateCategory(userId, category_id, fields) }));

  server.tool('delete_category', 'Permanently delete a category and its subcategories. Associated tasks remain, with affected category links removed.', {
    category_id: z.string().uuid(),
  }, async ({ category_id }) => jsonResponse({ success: await categoriesService.deleteCategory(userId, category_id) }));

  const validateProjectCategory = async (id?: string | null) => {
    if (!id) return;
    const roots = await categoriesService.getCategories(userId);
    if (!roots.flatMap(c => [c, ...(c.subcategories || [])]).some(c => c.id === id)) throw new Error('Category not found or access denied');
  };
  server.tool('create_project', 'Create a project with description, category, status, styling and target date.', CreateProjectSchema.shape,
    async (args) => {
      await validateProjectCategory(args.category_id);
      return jsonResponse({ project: await projectsService.createProject(userId, args) });
    });
  server.tool('update_project', 'Edit, complete, archive or restore a project. Omitted fields are preserved.', {
    project_id: z.string().uuid(), ...UpdateProjectSchema.shape,
  }, async ({ project_id, ...fields }) => {
    await validateProjectCategory(fields.category_id);
    return jsonResponse({ project: await projectsService.updateProject(userId, project_id, fields) });
  });
  server.tool('delete_project', 'Permanently delete a project. Its tasks remain with the project link removed.', {
    project_id: z.string().uuid(),
  }, async ({ project_id }) => jsonResponse({ success: await projectsService.deleteProject(userId, project_id) }));

  server.tool('list_reminders', 'List your reminders, optionally for a task. Paginate with offset and limit.', {
    task_id: z.string().uuid().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50),
  }, async ({ task_id, offset, limit }) => {
    let query = createAdminClient().from(PM_TABLES.REMINDERS).select('*', { count: 'exact' }).eq('user_id', userId);
    if (task_id) query = query.eq('task_id', task_id);
    const { data, error, count } = await query.order('remind_at').range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return jsonResponse({ reminders: data, total: count });
  });
  server.tool('update_reminder', 'Reschedule a reminder or change its delivery channel. Rescheduling reactivates it.', {
    reminder_id: z.string().uuid(), remind_at: z.string().datetime({ offset: true }).optional(), channel: z.enum(['EMAIL', 'PUSH', 'IN_APP']).optional(),
  }, async ({ reminder_id, remind_at, channel }) => {
    const { data, error } = await createAdminClient().from(PM_TABLES.REMINDERS)
      .update({ ...(remind_at !== undefined && { remind_at, status: 'PENDING', snoozed_until: null, error_message: null }), ...(channel !== undefined && { channel }) })
      .eq('user_id', userId).eq('id', reminder_id).select('*').single();
    if (error) throw new Error(error.message);
    return jsonResponse({ reminder: data });
  });
  server.tool('snooze_reminder', 'Snooze a reminder for a number of minutes.', {
    reminder_id: z.string().uuid(), minutes: z.number().int().min(1).max(43200).default(60),
  }, async ({ reminder_id, minutes }) => jsonResponse({ reminder: await remindersService.snoozeReminder(userId, reminder_id, minutes) }));
  server.tool('dismiss_reminder', 'Dismiss a reminder without deleting its task.', {
    reminder_id: z.string().uuid(),
  }, async ({ reminder_id }) => jsonResponse({ success: await remindersService.dismissReminder(userId, reminder_id) }));
  server.tool('delete_reminder', 'Permanently delete a reminder without deleting its task.', {
    reminder_id: z.string().uuid(),
  }, async ({ reminder_id }) => {
    const { error } = await createAdminClient().from(PM_TABLES.REMINDERS).delete().eq('user_id', userId).eq('id', reminder_id);
    if (error) throw new Error(error.message);
    return jsonResponse({ success: true });
  });

  return server;
}
