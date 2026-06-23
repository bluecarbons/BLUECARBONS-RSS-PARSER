import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { runAgenticParser } from './parser.js';
import { parseFeedXml } from './core/parser.js';
import { fetchTextWithRedirects } from './core/http.js';

/**
 * Resolve the default DB path relative to this file so it works correctly
 * regardless of the process CWD (12-factor, MCP hosts, monorepos, etc.).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '../data/rss-agent.db');

const DEFAULT_OPTIONS = {
  normalize: true,
  customFields: { feed: [], item: [] },
  headers: undefined,
  timeout: 10000,
  maxRedirects: 5,
  requestOptions: {}
};

function mergeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    customFields: {
      feed: [
        ...(DEFAULT_OPTIONS.customFields.feed || []),
        ...(options.customFields?.feed || [])
      ],
      item: [
        ...(DEFAULT_OPTIONS.customFields.item || []),
        ...(options.customFields?.item || [])
      ]
    },
    requestOptions: {
      ...DEFAULT_OPTIONS.requestOptions,
      ...(options.requestOptions || {})
    }
  };
}

export class ParserCompat {
  constructor(options = {}) {
    this.options = mergeOptions(options);
  }

  parseURL(url, callback) {
    const promise = fetchTextWithRedirects(url, this.options).then((xml) =>
      this.parseString(xml)
    );
    return maybeCallback(promise, callback);
  }

  parseString(xml, callback) {
    const promise = Promise.resolve(parseFeedXml(xml, this.options));
    return maybeCallback(promise, callback);
  }

  parseFile(filePath, callback) {
    const promise = readFile(filePath, 'utf8').then((xml) => this.parseString(xml));
    return maybeCallback(promise, callback);
  }

  async parseFeed(urls, config = {}) {
    return runAgenticParser({
      feedUrls: Array.isArray(urls) ? urls : [urls],
      dbPath: config.dbPath ?? DEFAULT_DB_PATH,
      fetchFullArticle: Boolean(config.fetchFullArticle),
      concurrency: config.concurrency,
      parserOptions: this.options,
      analyzer: config.analyzer,
      model: config.model
    });
  }
}

function maybeCallback(promise, callback) {
  if (typeof callback === 'function') {
    promise.then(
      (value) => callback(null, value),
      (error) => callback(error)
    );
    return undefined;
  }
  return promise;
}

export function createParser(options = {}) {
  return new ParserCompat(options);
}

export default ParserCompat;
