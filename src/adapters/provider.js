import { AnalysisSchema, validateAnalysis } from '../agent.js';

export async function createAnalyzer(config = {}) {
  const provider = config.provider ?? 'heuristic';
  const modelId = config.model;
  const apiKey = config.apiKey;
  const baseURL = config.baseURL;

  if (!provider || provider === 'heuristic') {
    return async ({ item, context }) => {
      const text = `${item.title}\n${item.contentSnippet ?? ''}\n${context ?? ''}`.toLowerCase();
      const signals = ['release', 'security', 'vulnerability', 'node', 'javascript', 'typescript', 'framework', 'api', 'breaking', 'performance', 'agent', 'rss'];
      const score = signals.reduce((total, signal) => total + (text.includes(signal) ? 1 : 0), 0);
      return validateAnalysis({
        decision: score >= 3 ? 'relevant' : 'ignore',
        confidence: Math.min(95, 35 + score * 10),
        summary: score >= 3 ? `Likely worth reading: ${item.title}` : `Low-signal item: ${item.title}`,
        impact: score >= 3 ? 'Could affect engineering decisions or tooling.' : 'Probably noise for a technical feed.',
        actionItems: score >= 3 ? ['Review the source article.', 'Share with the relevant team if actionable.'] : [],
        tags: signals.filter((signal) => text.includes(signal)).slice(0, 5)
      });
    };
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

    if (provider === 'openai' || provider === 'local') {
      const url = baseURL || (provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
      const endpoint = `${url.replace(/\/$/, '')}/chat/completions`;
      const authHeader = apiKey || (provider === 'local' ? 'local' : process.env.OPENAI_API_KEY || '');

      const response = await fetch(endpoint, {
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

      const response = await fetch(endpoint, {
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
