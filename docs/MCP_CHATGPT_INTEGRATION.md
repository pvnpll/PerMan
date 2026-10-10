# ChatGPT & Claude Remote MCP Integration Guide

PerMang includes an official implementation of the **Model Context Protocol (MCP)** using `@modelcontextprotocol/sdk` and `WebStandardStreamableHTTPServerTransport`.

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
4. ChatGPT will now prompt you to authorize your PerMang account on your first prompt!

### Option B: Via Personal Access Token (PAT)
1. Log in to PerMang and navigate to **Settings > ChatGPT MCP Integration**.
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
🤖 PerMang Remote MCP Server Smoke Test
========================================================

1. Connecting in-memory MCP client to PerMang server...
   ✓ Handshake successful!

2. Querying available tools (tools/list)...
   ✓ Found 12 registered tools
   🎉 All 12 required ChatGPT MCP tools are registered and valid!

3. Testing tool argument validation on "create_task"...
   ✓ Schema validation verified!
```
