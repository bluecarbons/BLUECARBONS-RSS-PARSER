#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import readline from 'node:readline';
import { runAgenticParser } from '../parser.js';
import { createAnalyzer } from '../adapters/provider.js';
import { fetchFullArticle } from '../fetch-article.js';

/**
 * Resolve the default DB path relative to this file so the server works
 * correctly regardless of the CWD at launch time. When invoked by a MCP
 * host (Claude Desktop, Cursor, VS Code) the CWD is unpredictable and a
 * relative './data/...' path would create or fail to find the DB in an
 * arbitrary location.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '../../data/rss-agent.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const tools = [
  {
    name: 'fetch_rss_feed',
    description:
      'Fetch and agentically analyse an RSS or Atom feed. Returns structured relevance decisions, confidence scores, summaries, action items, and tags for each feed item.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The RSS or Atom feed URL to fetch.' },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 10).',
          default: 10
        },
        provider: {
          type: 'string',
          enum: ['heuristic', 'openai', 'anthropic', 'local'],
          default: 'heuristic',
          description: 'Analysis provider to use. Defaults to heuristic (no API key required).'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'fetch_full_article',
    description:
      'Fetch the full plain-text content of an article URL, with HTML stripped. Useful for passing article body as context to a subsequent LLM analysis call.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The article URL to fetch and strip to plain text.' }
      },
      required: ['url']
    }
  }
];

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);

    if (request.jsonrpc !== '2.0') {
      return;
    }

    if (request.method === 'initialize') {
      sendResponse(request.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'agentic-rss-parser', version: '1.1.0' }
      });
      return;
    }

    if (request.method === 'notifications/initialized') {
      return;
    }

    if (request.method === 'tools/list') {
      sendResponse(request.id, { tools });
      return;
    }

    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params || {};
      try {
        const result = await handleToolCall(name, args);
        sendResponse(request.id, result);
      } catch (err) {
        sendError(request.id, -32603, err.message);
      }
      return;
    }

    if (request.id !== undefined) {
      sendError(request.id, -32601, 'Method not found');
    }
  } catch {
    sendError(null, -32700, 'Parse error');
  }
});

function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: '2.0', id, result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }));
}

async function handleToolCall(name, args) {
  if (name === 'fetch_rss_feed') {
    const url = args.url;
    const limit = Number.isInteger(args.limit) ? args.limit : 10;
    const provider = args.provider || 'heuristic';

    const analyzer = await createAnalyzer({ provider });
    const results = await runAgenticParser({
      feedUrls: [url],
      dbPath: DEFAULT_DB_PATH,
      analyzer,
      model: { provider }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results.slice(0, limit), null, 2)
        }
      ]
    };
  }

  if (name === 'fetch_full_article') {
    const url = args.url;
    const text = await fetchFullArticle(url);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ url, text }, null, 2)
        }
      ]
    };
  }

  throw new Error(`Tool not found: ${name}`);
}
