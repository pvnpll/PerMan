#!/usr/bin/env node

/**
 * PerMan MCP Stdio Bridge
 * Allows any MCP client (Antigravity, Claude Desktop, Cursor, etc.)
 * to talk to PerMan's cloud MCP server over standard input/output (stdio).
 */

import readline from 'readline';

const API_URL = process.env.PERMAN_API_URL || 'https://perman.pvnpll.in/api/mcp';
const API_TOKEN = process.env.PERMAN_API_TOKEN || 'pm_pat_b6d34e35f325fc8ca72d9a73897ff6f5261dbefe93cee9f0de6a50cdf81323df';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (parseErr) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: invalid JSON',
        },
      }) + '\n'
    );
    return;
  }

  const isNotification = payload.id === undefined || payload.id === null;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (isNotification) {
      // Notifications do not expect a response
      return;
    }

    const text = await response.text();
    if (!text.trim()) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: payload.id,
          error: {
            code: -32603,
            message: `Empty response from server (HTTP ${response.status})`,
          },
        }) + '\n'
      );
      return;
    }

    const data = JSON.parse(text);
    if (data.id === undefined) {
      data.id = payload.id;
    }
    process.stdout.write(JSON.stringify(data) + '\n');
  } catch (err) {
    if (isNotification) {
      return;
    }
    const errObj = {
      jsonrpc: '2.0',
      id: payload?.id ?? null,
      error: {
        code: -32603,
        message: err.message || 'Internal MCP Bridge Error',
      },
    };
    process.stdout.write(JSON.stringify(errObj) + '\n');
  }
});

