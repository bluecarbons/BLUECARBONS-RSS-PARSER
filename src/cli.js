#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runAgenticParser } from './parser.js';

function parseArgs(argv) {
  const args = { feeds: [], db: './data/rss-agent.db', fetchFullArticle: false };
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

const results = await runAgenticParser({
  feedUrls: args.feeds,
  dbPath,
  fetchFullArticle: args.fetchFullArticle
});

for (const { item, analysis } of results) {
  if (analysis.decision === 'relevant') {
    console.log(JSON.stringify({ title: item.title, link: item.link, ...analysis }, null, 2));
  }
}
