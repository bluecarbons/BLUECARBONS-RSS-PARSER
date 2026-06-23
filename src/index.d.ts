// ─── Shared building blocks ──────────────────────────────────────────────────

export interface CustomFieldTuple {
  0: string;
  1: string;
  2?: {
    keepArray?: boolean;
    includeSnippet?: boolean;
  };
}

export interface CustomFieldConfig {
  feed?: Array<string | [string, string] | CustomFieldTuple>;
  item?: Array<string | [string, string] | CustomFieldTuple>;
}

/** Options accepted by the parser layer (parseURL / parseString / parseFile). */
export interface ParserOptions {
  customFields?: CustomFieldConfig;
  /** Fallback RSS version used when the feed does not declare one. */
  defaultRSS?: number | string;
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 10 000). */
  timeout?: number;
  /** Maximum number of HTTP redirects to follow (default: 5). */
  maxRedirects?: number;
  requestOptions?: Record<string, unknown>;
  normalize?: boolean;
}

// ─── Feed / item shapes ──────────────────────────────────────────────────────

export interface ParserFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  creator?: string;
  [key: string]: unknown;
}

export interface ParserFeed<Feed = unknown, Item = ParserFeedItem> {
  feedUrl?: string;
  title?: string;
  description?: string;
  link?: string;
  items: Item[];
  [key: string]: unknown;
}

export type ParserCallback<T> = (err: Error | null, result?: T) => void;

// ─── Analysis shapes ─────────────────────────────────────────────────────────

/** The normalised result returned by every analysis provider. */
export interface AnalysisResult {
  decision: 'relevant' | 'ignore';
  /** Integer 0–100. */
  confidence: number;
  summary: string;
  impact: string;
  actionItems: string[];
  tags: string[];
}

// ─── Config shapes ───────────────────────────────────────────────────────────

export interface AnalyzerConfig {
  provider?: 'heuristic' | 'openai' | 'anthropic' | 'local';
  model?: string;
  apiKey?: string;
  baseURL?: string;
}

export interface AgenticParserConfig {
  feedUrls: string[];
  /** Absolute path to the SQLite database file. */
  dbPath: string;
  fetchFullArticle?: boolean;
  concurrency?: number;
  parserOptions?: ParserOptions;
  analyzer?: (input: { item: ParserFeedItem; context: string }) => unknown;
  model?: AnalyzerConfig;
}

export interface ParseFeedConfig {
  /** Override the default DB path (resolved relative to compat.js). */
  dbPath?: string;
  fetchFullArticle?: boolean;
  concurrency?: number;
  analyzer?: (input: { item: ParserFeedItem; context: string }) => unknown;
  model?: AnalyzerConfig;
}

// ─── Parser class ────────────────────────────────────────────────────────────

export class Parser<Feed = unknown, Item = ParserFeedItem> {
  constructor(options?: ParserOptions);

  parseURL(url: string): Promise<ParserFeed<Feed, Item>>;
  parseURL(url: string, callback: ParserCallback<ParserFeed<Feed, Item>>): void;

  parseString(xml: string): Promise<ParserFeed<Feed, Item>>;
  parseString(xml: string, callback: ParserCallback<ParserFeed<Feed, Item>>): void;

  parseFile(path: string): Promise<ParserFeed<Feed, Item>>;
  parseFile(path: string, callback: ParserCallback<ParserFeed<Feed, Item>>): void;

  parseFeed(
    urls: string | string[],
    config?: ParseFeedConfig
  ): Promise<Array<{ item: Item; analysis: AnalysisResult }>>;
}

export function createParser<Feed = unknown, Item = ParserFeedItem>(
  options?: ParserOptions
): Parser<Feed, Item>;

// ─── Core functions ──────────────────────────────────────────────────────────

export function runAgenticParser(
  config: AgenticParserConfig
): Promise<Array<{ item: ParserFeedItem; analysis: AnalysisResult }>>;

export function analyzeFeedItem(
  item: ParserFeedItem,
  options?: {
    fetchFullArticle?: boolean;
    analyzer?: (input: { item: ParserFeedItem; context: string }) => unknown;
  }
): Promise<AnalysisResult>;

/**
 * Heuristic signal-based analyser — no LLM or API key required.
 * Single source of truth; also used internally by the heuristic provider.
 */
export function heuristicAnalyze(
  item: ParserFeedItem,
  context?: string
): AnalysisResult;

export function fetchFullArticle(url: string): Promise<string>;

export function createStorage(dbPath: string): {
  hasProcessed(id: string): boolean;
  markProcessed(item: {
    id: string;
    feedUrl: string;
    title: string;
    link: string;
    publishedAt?: string | null;
  }): void;
  saveAnalysis(
    itemId: string,
    analysis: {
      id: string;
      decision: string;
      confidence: number;
      summary: string;
      impact: string;
      actionItems: string[];
      tags: string[];
    }
  ): void;
  close(): void;
};

export function createAnalyzer(
  config?: AnalyzerConfig
): Promise<(input: { item: ParserFeedItem; context: string }) => Promise<AnalysisResult>>;

// ─── MCP server namespace ────────────────────────────────────────────────────

/**
 * Types for the MCP server entry-point.
 * Full declarations live in src/mcp/server.d.ts.
 * Import via: import type { McpTool } from 'agentic-rss-parser/mcp'
 */
export * as McpServer from './mcp/server.js';

// ─── Default export ──────────────────────────────────────────────────────────

declare const ParserDefault: typeof Parser;
export default ParserDefault;
