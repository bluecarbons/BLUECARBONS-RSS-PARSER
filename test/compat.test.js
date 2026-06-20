import test from 'node:test';
import assert from 'node:assert/strict';
import { createParser } from '../src/compat.js';

test('ParserCompat exposes parseString and parseURL-compatible methods', async () => {
  const parser = createParser();

  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>Hello</title><link>https://example.com/a</link><description>World</description></item></channel></rss>`;
  const feed = await parser.parseString(xml);

  assert.equal(feed.title, 'Feed');
  assert.equal(feed.items[0].title, 'Hello');
});

test('ParserCompat supports callback style', async () => {
  const parser = createParser();

  await new Promise((resolve, reject) => {
    parser.parseString(
      `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title></channel></rss>`,
      (err, feed) => {
        if (err) return reject(err);
        try {
          assert.equal(feed.title, 'Feed');
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    );
  });
});
