import test from 'node:test';
import assert from 'node:assert/strict';
import { createParser } from '../src/compat.js';

test('ParserCompat supports custom field rename semantics', async () => {
  const parser = createParser({
    customFields: {
      item: [['dc:creator', 'creator']]
    }
  });

  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>Hello</title><link>https://example.com/a</link><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Jane Doe</dc:creator></item></channel></rss>`;
  const feed = await parser.parseString(xml);

  assert.equal(feed.items[0].creator, 'Jane Doe');
});

test('ParserCompat supports custom field snippet generation when available', async () => {
  const parser = createParser({
    customFields: {
      item: [['content:encoded', 'content', { includeSnippet: true }]]
    }
  });

  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><item><title>Hello</title><link>https://example.com/a</link><content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[<p>Hello <strong>world</strong></p>]]></content:encoded></item></channel></rss>`;
  const feed = await parser.parseString(xml);

  assert.equal(feed.items[0].content, '<p>Hello <strong>world</strong></p>');
  assert.equal(feed.items[0].contentSnippet, 'Hello world');
});
