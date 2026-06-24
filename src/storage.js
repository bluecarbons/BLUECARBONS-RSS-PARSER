import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createStorage(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_items (
      id          TEXT PRIMARY KEY,
      feed_url    TEXT NOT NULL,
      title       TEXT NOT NULL,
      link        TEXT NOT NULL,
      published_at TEXT,
      processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    CREATE TABLE IF NOT EXISTS analyses (
      id          TEXT PRIMARY KEY,
      item_id     TEXT NOT NULL,
      decision    TEXT NOT NULL,
      confidence  INTEGER NOT NULL,
      summary     TEXT NOT NULL,
      impact      TEXT NOT NULL,
      action_items TEXT NOT NULL,
      tags        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    -- Indexes for O(log n) lookups on common query paths.
    -- CREATE INDEX IF NOT EXISTS is idempotent on repeated cold starts.
    CREATE INDEX IF NOT EXISTS idx_processed_items_feed_url
      ON processed_items (feed_url);

    CREATE INDEX IF NOT EXISTS idx_analyses_item_id
      ON analyses (item_id);
  `);

  return {
    hasProcessed(id) {
      const row = db.prepare('SELECT 1 FROM processed_items WHERE id = ?').get(id);
      return Boolean(row);
    },

    markProcessed(item) {
      db
        .prepare(
          'INSERT OR IGNORE INTO processed_items (id, feed_url, title, link, published_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(item.id, item.feedUrl, item.title, item.link, item.publishedAt ?? null);
    },

    saveAnalysis(itemId, analysis) {
      // INSERT OR IGNORE: preserves the original created_at on duplicate rows.
      // INSERT OR REPLACE would delete + reinsert, silently resetting created_at.
      db
        .prepare(
          `INSERT OR IGNORE INTO analyses
           (id, item_id, decision, confidence, summary, impact, action_items, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
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
