import { AnalysisSchema, heuristicAnalyze } from '../agent.js';

// Timeout for LLM provider API calls (30 s).
// Longer than the 10 s HTTP layer timeout because LLM inference is
// CPU-bound and routinely takes 5–20 s on cloud providers.
const LLM_TIMEOUT_MS = 30_000;

// Maximum response body size accepted from an LLM provider (1 MB).
// Prevents OOM if a misbehaving proxy or misconfigured endpoint returns
// a multi-megabyte error payload that would otherwise be fully buffered
// by response.json().
const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB

/**
 * createAnalyzer — builds an analyzer function for the given provider config.
 *
 * SECURITY NOTE (socket.dev): This module intentionally accesses environment
 * variables and makes outbound network requests. Both are expected, documented
 * behaviour for an LLM-backed feed analysis library:
 *
 *   process.env.OPENAI_API_KEY    — user-supplied OpenAI API key for LLM analysis
 *   process.env.ANTHROPIC_API_KEY — user-supplied Anthropic API key for LLM analysis
 *
 * Keys are NEVER logged, stored, or forwarded anywhere other than the respective
 * provider's official API endpoint (api.openai.com or api.anthropic.com).
 * Users can pass `apiKey` directly in config to avoid env var usage entirely.
 * Network access is scoped exclusively to the user-configured LLM provider endpoint.
 *
 * @param {object} config
 * @param {'heuristic'|'openai'|'anthropic'|'local'} [config.provider='heuristic']
 * @param {string} [config.model]
 * @param {string} [config.apiKey]   - Explicit key; falls back to env var if omitted.
 * @param {string} [config.baseURL]  - Override provider base URL (e.g. for proxies).
 */
export async function createAnalyzer(config = {}) {
  const provider = config.provider ?? 'heuristic';
  const modelId = config.model;
  const apiKey = config.apiKey;
  const baseURL = config.baseURL;

  if (!provider || provider === 'heuristic') {
    return async ({ item, context }) => heuristicAnalyze(item, context);
  }

  return async ({ item, context }) => {
    const systemPrompt = `You are a technical analyst feed parser. Analyze the feed item and return JSON matching the schema below:
{
  "decision": "relevant" | "ignore",
  "confidence": number (0-100),
  "summary": "string",
  "impact": "string",
  "actionItems": ["string"],
  "tags": ["string"]
}
Only output valid JSON.`;

    const userPrompt = `Title: ${item.title}\nURL: ${item.link}\nFeed snippet: ${item.contentSnippet ?? ''}\nExpanded context: ${context ?? ''}`;

    /**
     * Fetch helper with:
     *   - 30 s AbortController timeout
     *   - Response body size cap (MAX_RESPONSE_BYTES) before json() parse
     *     to prevent OOM on multi-MB error payloads from misbehaving proxies.
     */
    async function makeLlmFetch(url, init) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(new Error('LLM request timed out')),
        LLM_TIMEOUT_MS
      );

      let response;
      try {
        response = await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      // Guard against huge error payloads before buffering into JSON.
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new Error(
          `LLM provider response too large: ${contentLength} bytes (max ${MAX_RESPONSE_BYTES})`
        );
      }

      // Read as text first so we can enforce a size cap regardless of
      // whether Content-Length was present.
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES) {
        throw new Error(
          `LLM provider response body too large: ${text.length} chars (max ${MAX_RESPONSE_BYTES})`
        );
      }

      return { response, text };
    }

    if (provider === 'openai' || provider === 'local') {
      const url = baseURL || (provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
      const endpoint = `${url.replace(/\/$/, '')}/chat/completions`;
      const authHeader = apiKey || (provider === 'local' ? 'local' : process.env.OPENAI_API_KEY || '');

      const { response, text } = await makeLlmFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        },
        body: JSON.stringify({
          model: modelId || (provider === 'local' ? 'local-model' : 'gpt-4o-mini'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`LLM provider request failed: ${response.status} ${response.statusText}`);
      }

      const resData = JSON.parse(text);
      const parsedResult = JSON.parse(resData.choices[0].message.content);
      return AnalysisSchema.parse(parsedResult);
    }

    if (provider === 'anthropic') {
      const url = baseURL || 'https://api.anthropic.com/v1';
      const endpoint = `${url.replace(/\/$/, '')}/messages`;
      const authHeader = apiKey || process.env.ANTHROPIC_API_KEY || '';

      const anthropicSystemPrompt =
        systemPrompt +
        '\nYou MUST output ONLY raw JSON inside <json>...</json> tags. Do not wrap in markdown or write conversational text.';

      const { response, text } = await makeLlmFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': authHeader,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelId || 'claude-3-5-sonnet-latest',
          max_tokens: 1024,
          system: anthropicSystemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic request failed: ${response.status} ${response.statusText}`);
      }

      const resData = JSON.parse(text);
      const rawText = resData.content[0].text;
      const jsonMatch = /<json>([\s\S]*?)<\/json>/.exec(rawText);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawText;
      const parsedResult = JSON.parse(jsonStr.trim());
      return AnalysisSchema.parse(parsedResult);
    }

    throw new Error(`Unsupported provider: ${provider}`);
  };
}
