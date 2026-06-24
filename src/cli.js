#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runAgenticParser } from './parser.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// FIX: default DB path resolved relative to this file (CWD-independent).
// Previously './data/rss-agent.db' was relative to process.cwd(), so running
// the CLI from any directory other than the repo root silently created the
// database in the wrong location. Now consistent with compat.js and mcp/server.js.
const DEFAULT_DB_PATH = join(__dirname, '../data/rss-agent.db');

function parseArgs(argv) {
  const args = { feeds: [], db: DEFAULT_DB_PATH, fetchFullArticle: false };
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--feed') args.feeds.push(argv[++i]);
    else if (current === '--db') args.db = argv[++i];
    else if (current === '--fetch-full-article') args.fetchFullArticle = true;
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.feeds.length) {
  console.error('Usage: agentic-rss-parser --feed <url> [--feed <url>] [--db <path>] [--fetch-full-article]');
  process.exit(1);
}

const dbPath = resolve(args.db);
if (!existsSync(resolve('.'))) {
  console.error('Working directory not found.');
  process.exit(1);
}

const { results, feedErrors } = await runAgenticParser({
  feedUrls: args.feeds,
  dbPath,
  fetchFullArticle: args.fetchFullArticle
});

if (feedErrors.length) {
  for (const { feedUrl, error } of feedErrors) {
    console.error(`[error] ${feedUrl}: ${error}`);
  }
}

for (const { item, analysis } of results) {
  if (analysis.decision === 'relevant') {
    console.log(JSON.stringify({ title: item.title, link: item.link, ...analysis }, null, 2));
  }
}
