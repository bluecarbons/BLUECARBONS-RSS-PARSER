import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createStorage(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_items (
      id TEXT PRIMARY KEY,
      feed_url TEXT NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      published_at TEXT,
      processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      summary TEXT NOT NULL,
      impact TEXT NOT NULL,
      action_items TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);

  return {
    hasProcessed(id) {
      const row = db.prepare('SELECT 1 FROM processed_items WHERE id = ?').get(id);
      return Boolean(row);
    },
    markProcessed(item) {
      db.prepare(
        'INSERT OR IGNORE INTO processed_items (id, feed_url, title, link, published_at) VALUES (?, ?, ?, ?, ?)'
      ).run(item.id, item.feedUrl, item.title, item.link, item.publishedAt ?? null);
    },
    saveAnalysis(itemId, analysis) {
      // FIX: INSERT OR IGNORE instead of INSERT OR REPLACE.
      // OR REPLACE deletes the old row then inserts a new one, permanently
      // destroying the original created_at timestamp. OR IGNORE skips
      // silently on conflict, preserving the first-seen analysis record.
      db.prepare(
        `INSERT OR IGNORE INTO analyses
         (id, item_id, decision, confidence, summary, impact, action_items, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        analysis.id,
        itemId,
        analysis.decision,
        analysis.confidence,
        analysis.summary,
        analysis.impact,
        JSON.stringify(analysis.actionItems),
        JSON.stringify(analysis.tags)
      );
    },
    close() {
      db.close();
    }
  };
}
