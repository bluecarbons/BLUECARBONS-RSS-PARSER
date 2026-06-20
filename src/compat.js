import Parser from 'rss-parser';
import { readFile } from 'node:fs/promises';
import { runAgenticParser } from './parser.js';

const DEFAULT_OPTIONS = {
  normalize: true,
  customFields: { feed: [], item: [] },
  headers: undefined,
  timeout: 10000
};

function mergeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    customFields: {
      feed: [...(DEFAULT_OPTIONS.customFields.feed || []), ...(options.customFields?.feed || [])],
      item: [...(DEFAULT_OPTIONS.customFields.item || []), ...(options.customFields?.item || [])]
    }
  };
}

export class ParserCompat {
  constructor(options = {}) {
    this.options = mergeOptions(options);
    this._parser = new Parser(this.options);
  }

  parseURL(url, callback) {
    const promise = fetch(url, this.options.requestOptions ? { ...this.options.requestOptions, headers: this.options.headers } : { headers: this.options.headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.text();
      })
      .then((xml) => this._parser.parseString(xml));
    return maybeCallback(promise, callback);
  }

  parseString(xml, callback) {
    const promise = this._parser.parseString(xml);
    return maybeCallback(promise, callback);
  }

  parseFile(filePath, callback) {
    const promise = readFile(filePath, 'utf8').then((xml) => this._parser.parseString(xml));
    return maybeCallback(promise, callback);
  }

  async parseFeed(urls, config = {}) {
    return runAgenticParser({
      feedUrls: Array.isArray(urls) ? urls : [urls],
      dbPath: config.dbPath ?? './data/rss-agent.db',
      fetchFullArticle: Boolean(config.fetchFullArticle),
      parserOptions: this.options,
      analyzer: config.analyzer,
      model: config.model
    });
  }
}

function maybeCallback(promise, callback) {
  if (typeof callback === 'function') {
    promise.then((value) => callback(null, value), (error) => callback(error));
    return undefined;
  }
  return promise;
}

export function createParser(options = {}) {
  return new ParserCompat(options);
}

export default ParserCompat;
