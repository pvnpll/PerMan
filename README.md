# PerMan — Personal Management & Task Reminder App

> **PerMan** (*Personal Management*) is a personal external memory for tasks, reminders, commitments, purchases, projects, routines, and everyday life.

---

## 🌟 Overview

PerMan is built to be your reliable second brain:
- **Instant Natural-Language Task Capture**: Capture tasks like *"Fix the Calflow water logging API tomorrow"*, *"Buy headphones from Amazon next month"*, or *"Remind me every Monday at 9 AM to review my tasks"*.
- **Multi-Tenant Database Isolation**: Operates safely inside the shared Supabase project `random` using strict `pm_` table prefixing, Row Level Security (RLS), and zero interference with other applications (`cf_*`, `ir_*`).
- **Remote Model Context Protocol (MCP)**: Native remote MCP server allowing ChatGPT and Claude to manage tasks, retrieve summaries, and schedule reminders on your behalf.
- **Idempotent Reminder Engine**: Server-side scheduled reminders with duplicate-delivery prevention, retry handling, snoozing, and delivery logs.
- **Mobile-First UX**: Responsive mobile bottom navigation bar and desktop sidebar with instant quick-add accessible throughout the application.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router with Turbopack) |
| **Language** | TypeScript |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons |
| **Database & Auth** | Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth |
| **Database Isolation** | Strict table prefix `pm_` (e.g. `pm_tasks`, `pm_categories`, `pm_reminders`) |
| **Validation** | Zod |
| **Date & Timezone** | `date-fns`, `date-fns-tz` (Timezone-aware scheduling) |
| **MCP Integration** | `@modelcontextprotocol/sdk` (Web Standard Streamable HTTP / SSE) |
| **Testing** | Vitest (Automated unit, schema, and migration safety tests) |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- npm or pnpm

### 2. Installation
```bash
git clone <repository-url> perman
cd perman
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials:
```env
# Supabase Project "random"
NEXT_PUBLIC_SUPABASE_URL=https://shfkfqdfahnxodewxupi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Reminder Engine Cron Security
CRON_SECRET=perman-cron-secret-2026

# Notification Delivery
NOTIFICATION_PROVIDER=console # or 'resend'
RESEND_API_KEY=
NOTIFICATION_FROM_EMAIL=notifications@perman.app
```

---

## 🗄️ Database Setup & Supabase Migration

PerMan shares the Supabase project **`random`** with other applications. **Every PerMan table is strictly isolated with the `pm_` prefix.**

### Database Schema Files:
- [`supabase/migrations/001_permang_initial_schema.sql`](supabase/migrations/001_permang_initial_schema.sql): Creates all 12 `pm_` tables, constraints, indexes, RLS policies, trigger functions, and seeds default categories.
- [`supabase/migrations/002_permang_seed_existing_users.sql`](supabase/migrations/002_permang_seed_existing_users.sql): Safely populates existing auth users with default taxonomy.

### Applying Migrations:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to project **`random`** (`shfkfqdfahnxodewxupi`).
2. Go to the **SQL Editor**.
3. Copy the contents of [`supabase/migrations/001_permang_initial_schema.sql`](supabase/migrations/001_permang_initial_schema.sql).
4. Run the script.

### Verify Schema Status:
Run the built-in database check script to confirm all `pm_` tables are recognized:
```bash
npx tsx scripts/db-check.ts
```

---

## 🤖 ChatGPT & Claude Remote MCP Integration

PerMan exposes a remote MCP server supporting both ChatGPT and Claude via Streamable HTTP / Server-Sent Events (SSE).

### MCP Endpoints:
- **MCP Tool Transport**: `https://<your-domain>/api/mcp`
- **OAuth Protected Resource Metadata (RFC 9470)**: `https://<your-domain>/.well-known/oauth-protected-resource/api/mcp`
- **OAuth Authorization**: `https://<your-domain>/mcp/authorize`
- **OAuth Token Exchange**: `https://<your-domain>/api/mcp/token`

### Exposing Tools:
1. `create_task`: Natural language or structured task capture with idempotency.
2. `search_tasks`: Keyword, status, priority, and date search.
3. `get_tasks`: Retrieve recent tasks by status.
4. `get_task`: Fetch single task by UUID.
5. `update_task`: Update title, deadline, priority, or reminder.
6. `complete_task`: Mark task completed (automatically handles recurrence).
7. `delete_task`: Safely remove task.
8. `list_categories`: List category & subcategory hierarchy.
9. `create_category`: Add category or subcategory.
10. `get_projects`: Overview of projects with progress metrics.
11. `create_reminder`: Schedule notifications.
12. `get_daily_summary`: Overview of today's tasks, overdue items, and upcoming deadlines.

### Connecting to ChatGPT (Custom GPT):
1. In ChatGPT, navigate to **Create a GPT** > **Configure** > **Actions** > **Create new action**.
2. Set Authentication to **OAuth 2.0**:
   - Client ID: `chatgpt-mcp`
   - Authorization URL: `https://<your-domain>/mcp/authorize`
   - Token URL: `https://<your-domain>/api/mcp/token`
3. Alternatively, generate a **Personal Access Token (PAT)** in **Settings > ChatGPT MCP Integration** inside PerMan and supply it as a `Bearer` token in the Custom GPT header.

### Testing MCP Locally:
Run the automated MCP smoke test client:
```bash
npx tsx scripts/test-mcp.ts
```

---

## ⏰ Reminder Engine & Scheduler

PerMan features a server-side reminder processor that runs independently of an open browser or ChatGPT session.

### Processing Endpoint:
- `GET/POST /api/cron/reminders`
- Secured with `Authorization: Bearer <CRON_SECRET>`

### Key Capabilities:
- **Duplicate Prevention**: Every dispatch computes a deterministic idempotency key (`rem_{id}_snooze{count}_{timestamp}`) stored in `pm_notification_logs`.
- **Snoozing**: Reminders can be snoozed (`+15m`, `+1h`, `+1d`), which increments `snooze_count` and updates `snoozed_until`.
- **Recurring Tasks**: Completing a recurring task automatically schedules the next occurrence in accordance with its recurrence frequency (Daily, Weekly, Monthly, Yearly).
- **Extensible Notifications**: Dispatches structured console alerts or sends rich HTML emails via Resend (`NOTIFICATION_PROVIDER=resend`).

### Scheduling via Vercel Cron:
In production, trigger `/api/cron/reminders` every minute or every 5 minutes by configuring `vercel.json` or external cron services.

---

## 🧪 Testing

Run the test suite using Vitest:
```bash
# Run all automated tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- **`migration-safety.test.ts`**: Verifies that every table, trigger, and index starts with `pm_` and RLS is enabled.
- **`nlp-parser.test.ts`**: Verifies natural language intent parsing (dates, merchants, priorities, recurrence).
- **`validation.test.ts`**: Tests Zod schema constraints.
- **`date-timezone.test.ts`**: Tests timezone conversions, overdue calculations, and today logic.
- **`reminders-idempotency.test.ts`**: Tests duplicate-delivery prevention and snooze logic.
- **`mcp-server.test.ts`**: Verifies MCP server registry and tool definitions.

---

## 🚢 Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Root Directory to `perman` (if inside a monorepo) or root.
4. Add the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your production Vercel URL, e.g. `https://perman.vercel.app`)
   - `CRON_SECRET`
5. Deploy.
