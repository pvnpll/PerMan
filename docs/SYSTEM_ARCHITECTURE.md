# PerMan System Architecture

## 1. Architectural Philosophy: Three Front Doors, One Service Layer

PerMan (*Personal Management*) acts as a persistent personal external memory across multiple interaction surfaces:
1. **The Web Application**: Next.js App Router (Dashboard, Inbox, All Tasks, Categories, Projects, Calendar, Settings).
2. **AI Assistants via Remote MCP**: ChatGPT and Claude operating remotely via Model Context Protocol tools.
3. **Automated Scheduler**: Background reminder processor and recurrence engine.

All three surfaces funnel through a single shared TypeScript service layer:
- `src/lib/services/tasks.service.ts`
- `src/lib/services/categories.service.ts`
- `src/lib/services/projects.service.ts`
- `src/lib/services/reminders.service.ts`
- `src/lib/services/notifications.service.ts`

---

## 2. Database Isolation Model (Supabase Project `random`)

PerMan shares the existing Supabase project `random` with sibling applications (`cf_*` Calflow, `ir_*` InstaReels).

### Mandatory Table Prefix: `pm_`
Every PerMan database object strictly uses the prefix `pm_`:
- `pm_profiles`: User timezone, full name, notification preferences.
- `pm_categories`: Hierarchical categories and subcategories with sort order, icons, and colors.
- `pm_projects`: Project records with target dates, colors, and progress indicators.
- `pm_recurrence_rules`: Frequency, interval, day patterns for recurring tasks.
- `pm_tasks`: Core task entities with due dates, reminder times, priorities, merchant, estimated amounts, external URLs.
- `pm_reminders`: Scheduled reminder queue with snooze counts and channel definitions.
- `pm_notification_logs`: Delivery history and duplicate-prevention logs.
- `pm_tags` & `pm_task_tags`: Many-to-many custom tagging.
- `pm_mcp_idempotency_keys`: Prevents duplicate creations during network retries.
- `pm_mcp_auth_codes`: OAuth 2.0 authorization codes for ChatGPT / Claude handshakes.
- `pm_mcp_tokens`: Bearer tokens for authenticated MCP sessions.

### Security & Row Level Security (RLS)
- Every user-owned table has RLS enabled with `user_id = auth.uid()` checks.
- Server-side background jobs (cron, MCP token verification) utilize the service role key securely.
- Service role keys and database passwords are never exposed to browser clients.

---

## 3. Natural Language Task Capture Engine

The NLP parser in `src/lib/nlp-parser.ts` decomposes raw conversational strings:
- **Project Recognition**: Detects "Calflow", "Rimev", "Klay", "Personal Website".
- **Category Inference**: Associates keywords like "bill", "gym", "interview", "amazon" with respective life areas.
- **Priority Detection**: Recognizes "urgent", "high priority", "asap", "someday".
- **Timezone-Aware Scheduling**: Distinguishes deadlines (*"due tomorrow"*, *"by Friday"*) from reminder notifications (*"remind me at 9 AM"*).
- **Merchant & Purchase Extraction**: Extracts vendors (Amazon, Flipkart) and monetary amounts ($120, ₹500).

---

## 4. Reminder Engine & Recurrence Processing

- **Schedule Processing**: Server-side endpoint `/api/cron/reminders` executes independently of the browser.
- **Deterministic Idempotency Key**: `rem_{id}_snooze{count}_{timestamp}` logged in `pm_notification_logs` guarantees notifications are never sent twice.
- **Recurrence Lifecycle**: When a recurring task is completed, `createNextRecurringInstance` calculates the subsequent due date and reminder time, generating a new scheduled task instance while preserving completion history.
