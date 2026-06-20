import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFeedItem } from '../src/agent.js';

test('heuristic analyzer returns a structured decision', async () => {
  const result = await analyzeFeedItem(
    {
      title: 'Node.js security release',
      link: 'https://example.com/node-security',
      contentSnippet: 'This release patches a vulnerability in Node.'
    },
    {}
  );

  assert.equal(result.decision, 'relevant');
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
  assert.ok(Array.isArray(result.tags));
});
