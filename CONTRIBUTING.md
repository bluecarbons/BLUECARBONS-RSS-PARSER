# Contributing to Agentic RSS Parser

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Development Setup

```bash
git clone https://github.com/bluecarbons/agentic-rss-parser.git
cd agentic-rss-parser
npm install   # installs dev deps only — zero production dependencies
```

**Requirements:** Node.js `>=22.5.0`. ESM-only package — all source files use `import`/`export`.

---

## Workflow

1. Fork the repo and create a feature branch from `main`.
2. Make your changes.
3. Run the full test suite: `npm test` (all tests must pass).
4. Run the linter: `npm run lint` (all source files must syntax-check cleanly).
5. Open a pull request against `main`.

---

## Project Structure

```
src/
  core/
    parser.js          Custom XML engine (RSS 2.0 + Atom, zero deps)
    http.js            fetch wrapper with redirect cap, timeout, size guard, userAgent
  adapters/
    provider.js        LLM provider adapters (heuristic, openai, anthropic, local)
  mcp/
    server.js          stdio JSON-RPC 2.0 MCP server
    server.d.ts        Types for the ./mcp export
  agent.js             Heuristic analyser + configurable signals (DEFAULT_HEURISTIC_SIGNALS,
                       resolveSignals, heuristicAnalyze)
  parser.js            Main agentic pipeline (fetch → parse → dedup → analyse)
  storage.js           SQLite dedup + analysis store (node:sqlite)
  compat.js            rss-parser drop-in compatibility layer
  fetch-article.js     Full article body extractor
  cli.js               CLI entry point
  index.js             Public API exports
  index.d.ts           TypeScript declarations
examples/
  direct.mjs           Minimal programmatic usage
  anthropic-sdk.mjs    Anthropic Messages API agentic loop
  openai-agents-sdk.mjs OpenAI Agents SDK FunctionTool
  vercel-ai-sdk.mjs    Vercel AI SDK tool() + generateText
  adk-real.mjs         Google ADK FunctionTool
test/
  ...                  Node built-in test runner (node --test)
```

---

## Key Conventions

- **Zero production dependencies** — this is a hard constraint. Do not add any `dependencies` to `package.json`. `devDependencies` are fine.
- **ESM only** — use `import`/`export`. No `require()`.
- **Security-first** — any PR touching HTTP, XML parsing, LLM prompts, or MCP handling must consider the security implications. See [SECURITY.md](./SECURITY.md).
- **No async where sync suffices** — `parseFeedXml` is synchronous; don't add unnecessary `await` wrappers.
- **Configurable, not opinionated** — new features should expose options rather than hardcoding behaviour (e.g. `signals`, `extraSignals`, `threshold` in v1.2.0).

---

## Extending Heuristic Signals

The built-in `DEFAULT_HEURISTIC_SIGNALS` are developer/tech-tool focused. When adding signal-related changes, export from `src/agent.js` and ensure `resolveSignals()` handles the priority chain correctly:

```
options.signals  →  full replacement
options.extraSignals  →  append to DEFAULT_HEURISTIC_SIGNALS
(neither)  →  DEFAULT_HEURISTIC_SIGNALS as-is
```

See `src/agent.js` for the canonical implementation.

---

## Adding a New LLM Provider

1. Add the provider name to `SUPPORTED_PROVIDERS` in `src/adapters/provider.js` and `ALLOWED_PROVIDERS` in `src/mcp/server.js`.
2. Add the provider branch in `createAnalyzer`.
3. Add the type to `AnalyzerConfig.provider` in `src/index.d.ts`.
4. Add a usage example in `examples/`.
5. Document in README.md under the API Reference table.

---

## Reporting Issues

Please open an issue on [GitHub Issues](https://github.com/bluecarbons/agentic-rss-parser/issues). Include your Node.js version, feed URL (if applicable), and the full error output.

For security vulnerabilities, see [SECURITY.md](./SECURITY.md).
