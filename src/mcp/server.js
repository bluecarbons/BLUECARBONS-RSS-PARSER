#!/usr/bin/env node
import readline from 'node:readline';
import { runAgenticParser } from '../parser.js';
import { createAnalyzer } from '../adapters/provider.js';
import { fetchFullArticle } from '../fetch-article.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const tools = [
  {
    name: 'fetch_rss_feed',
    description: 'The RSS or Atom feed URL to fetch.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The RSS or Atom feed URL to fetch.' },
        limit: { type: 'number', description: 'Maximum number of items to return.', default: 10 },
        provider: { type: 'string', enum: ['heuristic', 'openai', 'anthropic', 'local'], default: 'heuristic', description: 'Analysis provider to use.' }
      },
      required: ['url']
    }
  },
  {
    name: 'fetch_full_article',
    description: 'The article URL to fetch.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The article URL to fetch.' },
        provider: { type: 'string', enum: ['heuristic', 'openai', 'anthropic', 'local'], default: 'heuristic', description: 'Analysis provider to use.' }
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
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'agentic-rss-parser',
          version: '1.0.0'
        }
      });
      return;
    }

    if (request.method === 'notifications/initialized') {
      // No response required for notifications
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

    // Default response for unhandled method request
    if (request.id !== undefined) {
      sendError(request.id, -32601, 'Method not found');
    }
  } catch (err) {
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
      dbPath: './data/rss-agent.db',
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
