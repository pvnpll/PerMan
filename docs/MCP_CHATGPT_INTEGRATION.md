# ChatGPT & Claude Remote MCP Integration Guide

PerMan includes an official implementation of the **Model Context Protocol (MCP)** using `@modelcontextprotocol/sdk` and `WebStandardStreamableHTTPServerTransport`.

---

## 1. Endpoints

| Resource | URL Path | Description |
|---|---|---|
| **MCP Streamable Transport** | `/api/mcp` | Accepts POST requests with JSON-RPC tool invocations or GET for SSE streams. |
| **OAuth Protected Resource Metadata** | `/.well-known/oauth-protected-resource/api/mcp` | Standard RFC 9470 OAuth discovery document. |
| **User Authorization Screen** | `/mcp/authorize` | User consent screen approving ChatGPT or Claude access. |
| **Token Exchange** | `/api/mcp/token` | Exchanges authorization code for long-lived Bearer access token. |

---

## 2. Supported MCP Tools (12 Total)

1. `create_task`: Add a new task with title, priority, status, category, project, due date, reminder, merchant, amount, or raw natural language.
2. `search_tasks`: Filter by keyword, status, priority, or date filter (`today`, `overdue`, `upcoming`).
3. `get_tasks`: Retrieve recent tasks.
4. `get_task`: Retrieve detailed task by UUID.
5. `update_task`: Modify existing task title, notes, deadline, or priority.
6. `complete_task`: Mark task completed (automatically handles recurrence).
7. `delete_task`: Remove task permanently.
8. `list_categories`: Retrieve full category & subcategory hierarchy.
9. `create_category`: Create a category or subcategory.
10. `get_projects`: Retrieve all projects with progress percentages and task counts.
11. `create_reminder`: Schedule a notification alert for any task.
12. `get_daily_summary`: Get today's breakdown (overdue, due today, high priority, inbox count).

---

## 3. Connecting to ChatGPT (Custom GPT)

### Option A: Via OAuth 2.0 (Recommended for Custom GPTs)
1. In ChatGPT, navigate to **My GPTs** > **Create a GPT** > **Configure**.
2. Click **Create new action**.
3. Under **Authentication**, select **OAuth**:
   - **Client ID**: `chatgpt-mcp`
   - **Client Secret**: *(Any random string or leave blank if using PKCE)*
   - **Authorization URL**: `https://<your-deployed-domain>/mcp/authorize`
   - **Token URL**: `https://<your-deployed-domain>/api/mcp/token`
   - **Scope**: `tasks:read tasks:write reminders:write`
4. ChatGPT will now prompt you to authorize your PerMan account on your first prompt!

### Option B: Via Personal Access Token (PAT)
1. Log in to PerMan and navigate to **Settings > ChatGPT MCP Integration**.
2. Click **Generate New Token**.
3. Copy the token (e.g. `pm_pat_...`).
4. In ChatGPT Custom GPT Actions, configure Authentication as **API Key**:
   - **Auth Type**: Bearer
   - **Token**: `pm_pat_...`

---

## 4. Local Smoke Testing

An automated in-memory client test is provided:
```bash
npx tsx scripts/test-mcp.ts
```
Expected output:
```
========================================================
🤖 PerMan Remote MCP Server Smoke Test
========================================================

1. Connecting in-memory MCP client to PerMan server...
   ✓ Handshake successful!

2. Querying available tools (tools/list)...
   ✓ Found 12 registered tools
   🎉 All 12 required ChatGPT MCP tools are registered and valid!

3. Testing tool argument validation on "create_task"...
   ✓ Schema validation verified!
```


## Personal memory and automatic organization

When connected through MCP, ChatGPT chooses `category_name`, `subcategory_name`,
and `project_name` from the conversation when calling `create_task`. Missing groups
are created automatically; existing names are reused case-insensitively within
their parent. New projects also receive a project record for progress tracking.

- Project work defaults to `Projects → project_name → task`.
- Other tasks default to `Personal → subcategory_name → task`. When no subgroup
  is supplied, the natural-language parser can suggest one (health, finances,
  shopping, etc.). Unclassified tasks stay under Personal.
- Explicit category names allow other life areas, such as Work or Learning.
- Put full requirements, acceptance criteria, context, and next steps in
  `description`, and the Jira or reference link in `url`. These are persisted
  and returned by `get_task`; no Jira connection or ticket import is implied.
- Use `get_projects` or `list_categories` to discover IDs, then `get_tasks` or
  `search_tasks` with `project_id`, `category_id`, and `status: "NEXT"` to recall
  next actions. Search also supports pagination through `offset`.

Example create_task input:

```json
{
  "title": "APP-42: Fix sign-in redirect",
  "project_name": "My App",
  "description": "Return users to the page they requested after signing in. Acceptance criteria: preserve the requested path; fall back to the dashboard. Next: reproduce the redirect failure.",
  "status": "NEXT",
  "priority": "HIGH"
}
```

Categorization uses ChatGPT's reasoning through MCP plus a lightweight parser
fallback; the app does not run a separate background AI classifier. Existing
uncategorized tasks are preserved and are not automatically migrated.

## Full task organization

`update_task` accepts category/subcategory/project names or owned UUIDs, all editable task details, recurrence, nullable dates, links, amounts, and archived_at (null restores). Omitted fields are preserved. Missing names are created automatically. Use category_name="Shopping & Purchases" and subcategory_name="Fitness & Nutrition" to categorize an existing task.

Additional tools: update_category, delete_category, create_project, update_project, delete_project, list_reminders, update_reminder, snooze_reminder, dismiss_reminder, delete_reminder. Category edits support name, styling, order and archive state. get_tasks supports pagination and archived tasks. All operations are scoped to the authenticated account.

After deployment, refresh the PerMan connected app in ChatGPT to load the updated tool definitions. ChatGPT may still request confirmation for actions according to its own approval policy.
