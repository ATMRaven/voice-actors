#!/usr/bin/env node

/**
 * VoxFlow Online TTS - Model Context Protocol (MCP) Server
 * Stdio transport implementation for Antigravity & LLM integrations
 */

const readline = require('readline');
const { TOOL_DEFINITIONS, handleToolCall } = require('./tools');

const SERVER_NAME = 'voxflow-tts';
const SERVER_VERSION = '1.0.0';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id, code, message, data = null) {
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  });
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (e) {
    return sendError(null, -32700, 'Parse error: Invalid JSON');
  }

  const { id, method, params } = msg;

  // Handle Notifications (no ID)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      // Client confirmed initialization
    }
    return;
  }

  // Handle Methods
  try {
    switch (method) {
      case 'initialize': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        });
        break;
      }

      case 'tools/list': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOL_DEFINITIONS
          }
        });
        break;
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          sendError(id, -32602, 'Invalid params: Tool name is required');
          break;
        }

        try {
          const result = await handleToolCall(name, toolArgs || {});
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (toolError) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Error executing ${name}: ${toolError.message}`
                }
              ]
            }
          });
        }
        break;
      }

      case 'ping': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {}
        });
        break;
      }

      default: {
        sendError(id, -32601, `Method not found: ${method}`);
        break;
      }
    }
  } catch (err) {
    sendError(id, -32603, `Internal error: ${err.message}`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
