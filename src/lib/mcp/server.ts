import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as tasksService from '@/lib/services/tasks.service';
import * as categoriesService from '@/lib/services/categories.service';
import * as projectsService from '@/lib/services/projects.service';
import * as remindersService from '@/lib/services/reminders.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { PM_TABLES } from '@/lib/db-tables';
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

export function createPerMangMcpServer(authInfo: McpAuthInfo) {
  const server = new McpServer({
    name: 'permang-mcp',
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
    'Create a new personal management task in PerMang. Supports structured parameters or raw natural language capture.',
    {
      title: z.string().describe('The task title or quick-add text (e.g. "Buy headphones from Amazon next month")'),
      description: z.string().optional().describe('Optional detailed notes or description'),
      category_name: z.string().optional().describe('Optional category name (e.g. "Finances", "Shopping", "Development")'),
      project_name: z.string().optional().describe('Optional project name (e.g. "Calflow", "Rimev", "Klay")'),
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional().default('INBOX'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
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

      let categoryId: string | null = null;
      const targetCatName = args.category_name || parsed.categoryName;
      if (targetCatName) {
        const cat = await categoriesService.findCategoryByName(userId, targetCatName);
        if (cat) categoryId = cat.id;
      }

      let projectId: string | null = null;
      const targetProjName = args.project_name || parsed.projectName;
      if (targetProjName) {
        const proj = await projectsService.findProjectByName(userId, targetProjName);
        if (proj) projectId = proj.id;
      }

      const task = await tasksService.createTask(userId, {
        title: parsed.title || args.title,
        description: args.description,
        category_id: categoryId,
        project_id: projectId,
        status: args.status || parsed.status || 'INBOX',
        priority: (args.priority || parsed.priority || 'MEDIUM') as any,
        due_date: args.due_date || parsed.dueDate || null,
        reminder_time: args.reminder_time || parsed.reminderTime || null,
        timezone: userTz,
        recurrence_rule: parsed.recurrenceRule || null,
        source: 'MCP',
        external_url: args.url || parsed.url || null,
        merchant: args.merchant || parsed.merchant || null,
        estimated_amount: args.estimated_amount || parsed.estimatedAmount || null,
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
        message: `Task "${task.title}" created successfully in PerMang`,
        task,
      });
    }
  );

  // 2. tool: search_tasks
  server.tool(
    'search_tasks',
    'Search PerMang tasks by keyword, status, priority, or due date range',
    {
      query: z.string().optional().describe('Keyword search in title, description, or merchant'),
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      due_date: z.enum(['today', 'overdue', 'upcoming']).optional(),
      limit: z.number().optional().default(20),
    },
    async (args) => {
      const res = await tasksService.getTasks(userId, {
        query: args.query,
        status: args.status,
        priority: args.priority,
        due_date: args.due_date,
        limit: args.limit || 20,
        offset: 0,
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
    'Get recent active tasks from PerMang inbox, scheduled, or next lists',
    {
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional(),
      limit: z.number().optional().default(20),
    },
    async (args) => {
      const res = await tasksService.getTasks(userId, {
        status: args.status,
        limit: args.limit || 20,
        offset: 0,
        archived: false,
        sort_by: 'created_at',
        sort_direction: 'desc',
      });

      return jsonResponse(res);
    }
  );

  // 4. tool: get_task
  server.tool(
    'get_task',
    'Get details of a specific PerMang task by UUID',
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
    'Update an existing task in PerMang',
    {
      task_id: z.string().uuid().describe('The task UUID'),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      due_date: z.string().optional().describe('ISO 8601 string or null'),
      reminder_time: z.string().optional().describe('ISO 8601 string or null'),
    },
    async (args) => {
      const updated = await tasksService.updateTask(userId, args.task_id, {
        title: args.title,
        description: args.description,
        status: args.status,
        priority: args.priority,
        due_date: args.due_date,
        reminder_time: args.reminder_time,
      });

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
    'Mark a task as completed in PerMang',
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
    'Permanently delete a task from PerMang',
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
    'List all user categories and subcategories in PerMang',
    {},
    async () => {
      const categories = await categoriesService.getCategories(userId);
      return jsonResponse({ categories });
    }
  );

  // 9. tool: create_category
  server.tool(
    'create_category',
    'Create a new category or subcategory in PerMang',
    {
      name: z.string().describe('Category name'),
      parent_category_name: z.string().optional().describe('Optional parent category name if creating a subcategory'),
    },
    async (args) => {
      let parentId: string | null = null;
      if (args.parent_category_name) {
        const parent = await categoriesService.findCategoryByName(userId, args.parent_category_name);
        if (parent) parentId = parent.id;
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

  return server;
}
