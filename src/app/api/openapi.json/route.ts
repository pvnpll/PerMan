import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'PerMang API',
      description: 'Personal Management & Task Reminder App API for ChatGPT Actions and custom integrations.',
      version: '1.0.0',
    },
    servers: [
      {
        url: baseUrl,
        description: 'PerMang Production Server',
      },
    ],
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          description: 'PerMang OAuth 2.0 Authentication',
          flows: {
            authorizationCode: {
              authorizationUrl: `${baseUrl}/mcp/authorize`,
              tokenUrl: `${baseUrl}/api/mcp/token`,
              scopes: {
                'tasks:read': 'Read tasks, categories, and projects',
                'tasks:write': 'Create and update tasks',
                'reminders:write': 'Schedule and manage reminders',
              },
            },
          },
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Personal Access Token (pm_live_...) from PerMang Settings',
        },
      },
    },
    security: [{ OAuth2: [] }, { BearerAuth: [] }],
    paths: {
      '/api/tasks': {
        get: {
          operationId: 'listTasks',
          summary: 'List and filter tasks',
          description: 'Retrieve user tasks with optional filters for status, priority, category, or search keyword.',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE', 'CANCELLED'] }, required: false },
            { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }, required: false },
            { name: 'search', in: 'query', schema: { type: 'string' }, required: false, description: 'Keyword to search in title and description' },
          ],
          responses: {
            '200': {
              description: 'Successful list of tasks',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
        post: {
          operationId: 'createTask',
          summary: 'Create a new task',
          description: 'Create a task in PerMang with optional category, project, priority, and due date.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', description: 'Task title (e.g. "Buy headphones from Amazon next month")' },
                    description: { type: 'string', description: 'Additional notes' },
                    status: { type: 'string', enum: ['INBOX', 'NEXT', 'SCHEDULED', 'WAITING', 'DONE'], default: 'INBOX' },
                    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                    due_date: { type: 'string', format: 'date-time', description: 'ISO 8601 date string' },
                    reminder_time: { type: 'string', format: 'date-time', description: 'ISO 8601 reminder timestamp' },
                    merchant: { type: 'string', description: 'Merchant or store name (e.g. Amazon, Flipkart)' },
                    estimated_amount: { type: 'number', description: 'Estimated purchase amount' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Task created successfully',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/tasks/{id}': {
        get: {
          operationId: 'getTask',
          summary: 'Get a specific task by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Task details' } },
        },
        delete: {
          operationId: 'deleteTask',
          summary: 'Delete a task by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Task deleted successfully' } },
        },
      },
      '/api/tasks/{id}/complete': {
        post: {
          operationId: 'completeTask',
          summary: 'Mark a task as completed',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Task marked as completed' } },
        },
      },
      '/api/categories': {
        get: {
          operationId: 'listCategories',
          summary: 'List all task categories and subcategories',
          responses: { '200': { description: 'Hierarchical categories list' } },
        },
      },
      '/api/projects': {
        get: {
          operationId: 'listProjects',
          summary: 'List all active projects',
          responses: { '200': { description: 'Active projects list' } },
        },
      },
      '/api/summary': {
        get: {
          operationId: 'getDailySummary',
          summary: 'Get today summary of overdue, due today, and high-priority tasks',
          responses: { '200': { description: 'Daily task metrics summary' } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
