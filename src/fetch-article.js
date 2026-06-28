import { fetchTextWithRedirects } from './core/http.js';
import { stripHtml } from './core/parser.js';

const MAX_SNIPPET_CHARS = 1200;

/**
 * Fetch a remote article URL and return a plain-text snippet.
 *
 * Delegates to fetchTextWithRedirects so all requests share the same
 * safety guarantees: 10 s timeout, max-5-redirect cap, http/https
 * protocol enforcement, and a consistent user-agent.
 *
 * @param {string} url - The article URL to fetch.
 * @returns {Promise<string>} Plain-text snippet, capped at MAX_SNIPPET_CHARS.
 */
export async function fetchFullArticle(url) {
  const result = await fetchTextWithRedirects(url, {
    timeout: 10000,
    maxRedirects: 5
  });

  // fetchTextWithRedirects returns null on 304 Not Modified.
  if (result === null) return '';
  const body = result.text;

  const plainText = body.trimStart().startsWith('<')
    ? stripHtml(body)
    : body.replace(/\s+/g, ' ').trim();

  return plainText.slice(0, MAX_SNIPPET_CHARS);
}
