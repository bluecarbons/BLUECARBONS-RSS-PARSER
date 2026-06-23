import { fetchFullArticle } from './fetch-article.js';

function validateAnalysis(result) {
  const decision = result?.decision === 'relevant' ? 'relevant' : 'ignore';
  const confidence = Number.isFinite(result?.confidence)
    ? Math.max(0, Math.min(100, Math.trunc(result.confidence)))
    : 0;
  const summary = typeof result?.summary === 'string' && result.summary.trim() ? result.summary.trim() : 'No summary provided.';
  const impact = typeof result?.impact === 'string' && result.impact.trim() ? result.impact.trim() : 'No impact provided.';
  const actionItems = Array.isArray(result?.actionItems)
    ? result.actionItems.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : [];
  const tags = Array.isArray(result?.tags)
    ? [...new Set(result.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()))]
    : [];

  return { decision, confidence, summary, impact, actionItems, tags };
}

export const AnalysisSchema = {
  parse(result) {
    return validateAnalysis(result);
  }
};

function heuristicAnalyze(item, context) {
  const text = `${item.title}\n${item.contentSnippet ?? ''}\n${context ?? ''}`.toLowerCase();
  const signals = [
    'release',
    'security',
    'vulnerability',
    'node',
    'javascript',
    'typescript',
    'framework',
    'api',
    'breaking',
    'performance',
    'agent',
    'rss'
  ];
  const score = signals.reduce((total, signal) => total + (text.includes(signal) ? 1 : 0), 0);
  const confidence = Math.min(95, 35 + score * 10);
  const decision = score >= 3 ? 'relevant' : 'ignore';
  return validateAnalysis({
    decision,
    confidence,
    summary: decision === 'relevant' ? `Likely worth reading: ${item.title}` : `Low-signal item: ${item.title}`,
    impact: decision === 'relevant' ? 'Could affect engineering decisions or tooling.' : 'Probably noise for a technical feed.',
    actionItems: decision === 'relevant' ? ['Review the source article.', 'Share with the relevant team if actionable.'] : [],
    tags: [...new Set(signals.filter((signal) => text.includes(signal)).slice(0, 5))]
  });
}

export async function analyzeFeedItem(item, options = {}) {
  const shouldFetch = Boolean(options.fetchFullArticle) && !item.contentSnippet;
  const context = shouldFetch ? await fetchFullArticle(item.link) : item.contentSnippet ?? item.content ?? '';

  if (typeof options.analyzer === 'function') {
    const result = await options.analyzer({ item, context });
    return validateAnalysis(result);
  }

  return heuristicAnalyze(item, context);
}

export { validateAnalysis };
