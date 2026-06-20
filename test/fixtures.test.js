import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createParser } from '../src/compat.js';

test('ParserCompat parses a realistic RSS fixture', async () => {
  const parser = createParser({
    customFields: {
      item: [['dc:creator', 'creator'], ['content:encoded', 'content', { includeSnippet: true }]]
    }
  });

  const xml = await readFile(new URL('./fixtures/rss-sample.xml', import.meta.url), 'utf8');
  const feed = await parser.parseString(xml);

  assert.equal(feed.title, 'Sample RSS Feed');
  assert.equal(feed.items[0].title, 'First Post');
  assert.equal(feed.items[0].creator, 'Jane Doe');
});

test('ParserCompat parses a realistic Atom fixture', async () => {
  const parser = createParser();
  const xml = await readFile(new URL('./fixtures/atom-sample.xml', import.meta.url), 'utf8');
  const feed = await parser.parseString(xml);

  assert.equal(feed.title, 'Sample Atom Feed');
  assert.equal(feed.items[0].title, 'Atom Entry');
  assert.equal(feed.items[0].link, 'https://example.com/entries/1');
});
