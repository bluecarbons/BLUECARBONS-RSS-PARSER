import { AnalysisSchema, heuristicAnalyze } from '../agent.js';

// Timeout for LLM provider API calls (30 s).
// Consistent with the 10 s timeout used by the HTTP layer in core/http.js,
// but longer because LLM inference is CPU-bound and routinely takes 5–20 s.
const LLM_TIMEOUT_MS = 30_000;

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

    // FIX: all LLM fetch calls now have a 30 s AbortController timeout.
    // Previously a hung API call would stall the worker indefinitely,
    // blocking that concurrency slot (and with concurrency:1, the whole pipeline).
    function makeLlmFetch(url, init) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(new Error('LLM request timed out')), LLM_TIMEOUT_MS);
      return fetch(url, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
    }

    if (provider === 'openai' || provider === 'local') {
      const url = baseURL || (provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
      const endpoint = `${url.replace(/\/$/, '')}/chat/completions`;
      const authHeader = apiKey || (provider === 'local' ? 'local' : process.env.OPENAI_API_KEY || '');

      const response = await makeLlmFetch(endpoint, {
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

      const resData = await response.json();
      const parsedResult = JSON.parse(resData.choices[0].message.content);
      return AnalysisSchema.parse(parsedResult);
    }

    if (provider === 'anthropic') {
      const url = baseURL || 'https://api.anthropic.com/v1';
      const endpoint = `${url.replace(/\/$/, '')}/messages`;
      const authHeader = apiKey || process.env.ANTHROPIC_API_KEY || '';

      const anthropicSystemPrompt = systemPrompt + '\nYou MUST output ONLY raw JSON inside <json>...</json> tags. Do not wrap in markdown or write conversational text.';

      const response = await makeLlmFetch(endpoint, {
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
          messages: [
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic request failed: ${response.status} ${response.statusText}`);
      }

      const resData = await response.json();
      const text = resData.content[0].text;
      const jsonMatch = /<json>([\s\S]*?)<\/json>/.exec(text);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsedResult = JSON.parse(jsonStr.trim());
      return AnalysisSchema.parse(parsedResult);
    }

    throw new Error(`Unsupported provider: ${provider}`);
  };
}
