#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runAgenticParser } from '../parser.js';
import { createAnalyzer } from '../adapters/provider.js';
import { fetchFullArticle } from '../fetch-article.js';

const server = new McpServer({
  name: 'agentic-rss-parser',
  version: '1.0.0'
});

server.tool(
  'fetch_rss_feed',
  {
    url: z.string().url().describe('The RSS or Atom feed URL to fetch.'),
    limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of items to return.'),
    provider: z.enum(['heuristic', 'openai', 'anthropic', 'local']).default('heuristic').describe('Analysis provider to use.')
  },
  async ({ url, limit, provider }) => {
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
);

server.tool(
  'fetch_full_article',
  {
    url: z.string().url().describe('The article URL to fetch.'),
    provider: z.enum(['heuristic', 'openai', 'anthropic', 'local']).default('heuristic').describe('Analysis provider to use.')
  },
  async ({ url, provider }) => {
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
);

const transport = new StdioServerTransport();
await server.connect(transport);
