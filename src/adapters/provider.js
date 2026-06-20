import { AnalysisSchema, validateAnalysis } from '../agent.js';
import { z } from 'zod';

async function loadProviderModel(provider, modelId, apiKey, baseURL) {
  if (!provider || provider === 'heuristic') return null;

  if (provider === 'openai') {
    const { openai } = await import('@ai-sdk/openai');
    return openai(modelId ?? 'gpt-4o-mini', apiKey ? { apiKey, baseURL } : baseURL ? { baseURL } : undefined);
  }

  if (provider === 'anthropic') {
    const { anthropic } = await import('@ai-sdk/anthropic');
    return anthropic(modelId ?? 'claude-3-5-sonnet-latest', apiKey ? { apiKey, baseURL } : baseURL ? { baseURL } : undefined);
  }

  if (provider === 'local') {
    const { openai } = await import('@ai-sdk/openai');
    return openai(modelId ?? 'local-model', {
      apiKey: apiKey ?? 'local',
      baseURL: baseURL ?? 'http://localhost:11434/v1'
    });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function createAnalyzer(config = {}) {
  const model = await loadProviderModel(config.provider, config.model, config.apiKey, config.baseURL);

  if (!model) {
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
    const { generateObject } = await import('ai');
    const schema = z.object({
      decision: z.enum(['relevant', 'ignore']),
      confidence: z.number().int().min(0).max(100),
      summary: z.string().min(1),
      impact: z.string().min(1),
      actionItems: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([])
    });

    const prompt = [
      `Title: ${item.title}`,
      `URL: ${item.link}`,
      `Feed snippet: ${item.contentSnippet ?? ''}`,
      `Expanded context: ${context ?? ''}`
    ].join('\n');

    const response = await generateObject({
      model,
      schema,
      prompt
    });

    return AnalysisSchema.parse(response.object);
  };
}
