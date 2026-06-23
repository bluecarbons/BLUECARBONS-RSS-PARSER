import { fetchTextWithRedirects } from './core/http.js';

const MAX_SNIPPET_CHARS = 1200;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const body = await fetchTextWithRedirects(url, {
    timeout: 10000,
    maxRedirects: 5
  });

  const plainText = body.trimStart().startsWith('<')
    ? stripHtml(body)
    : body.replace(/\s+/g, ' ').trim();

  return plainText.slice(0, MAX_SNIPPET_CHARS);
}
