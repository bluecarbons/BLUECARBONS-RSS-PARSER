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

export async function fetchFullArticle(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'agentic-rss-parser/1.0 (+https://example.local)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();
  const plainText = contentType.includes('text/html') ? stripHtml(body) : body.replace(/\s+/g, ' ').trim();

  return plainText.slice(0, MAX_SNIPPET_CHARS);
}
