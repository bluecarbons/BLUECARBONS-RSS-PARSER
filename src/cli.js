#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { runAgenticParser } from './parser.js';

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Default DB path resolved relative to this file — CWD-independent.
// Consistent with compat.js and mcp/server.js.
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
  console.error(
    'Usage: agentic-rss-parser --feed <url> [--feed <url>] [--db <path>] [--fetch-full-article]'
  );
  process.exit(1);
}

const dbPath = resolve(args.db);

const { results, feedErrors } = await runAgenticParser({
  feedUrls: args.feeds,
  dbPath,
  fetchFullArticle: args.fetchFullArticle
});

// Surface per-feed errors to stderr so CI/scripts can detect partial failures.
if (feedErrors.length) {
  for (const { feedUrl, error } of feedErrors) {
    console.error(`[error] ${feedUrl}: ${error}`);
  }
  // Non-zero exit when every feed failed; partial success still exits 0
  // so callers can process the results that did succeed.
  if (!results.length) {
    process.exitCode = 1;
  }
}

for (const { item, analysis } of results) {
  if (analysis.decision === 'relevant') {
    console.log(JSON.stringify({ title: item.title, link: item.link, ...analysis }, null, 2));
  }
}
