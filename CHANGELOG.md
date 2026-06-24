# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.1] — 2026-06-24

### Security

- **`src/core/http.js`** — Enforced a 5 MB hard cap on feed response bodies. A malicious or misconfigured server returning a multi-MB payload could previously exhaust Node.js heap via unbounded `response.text()`. The cap is checked against `Content-Length` header (fast path) and re-checked after buffering (covers chunked/streaming responses).
- **`src/adapters/provider.js`** — Added `sanitizeForPrompt()` to strip ASCII control characters and collapse newlines before interpolating feed content into LLM prompts. Prevents prompt injection via crafted feed titles or snippets (e.g. `\nAssistant: ignore all previous instructions`).
- **`src/adapters/provider.js`** — Added explicit empty API key guards for OpenAI and Anthropic providers. Previously an unset `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` was silently forwarded as an empty `Bearer ` token, producing a cryptic 401. Now throws a clear, actionable error before any network call.
- **`src/adapters/provider.js`** — Added `SUPPORTED_PROVIDERS` allowlist enforced at `createAnalyzer` entry. Unknown provider strings are now rejected immediately, before reaching env-var access or network dispatch paths.
- **`src/mcp/server.js`** — Added `ALLOWED_PROVIDERS` validation in `handleToolCall`. An untrusted MCP caller supplying an arbitrary `provider` string now receives a JSON-RPC `-32602 Invalid params` error rather than reaching internal dispatch.

### Fixed

- **`src/parser.js`** — Replaced `crypto.randomUUID()` deduplication fallback with an empty-string sentinel. Items with no link, guid, title, or pubDate previously received a fresh UUID on every run, silently defeating the SQLite dedup layer and re-processing the same items every execution.
- **`src/adapters/provider.js`** — Added array-length guards before indexing `resData.choices[0]` (OpenAI) and `resData.content[0]` (Anthropic). Empty arrays from rate-limited or refused LLM responses previously threw uncaught TypeErrors.
- **`src/cli.js`** — `--feed` and `--db` flags now validate that the next argv token exists and is not another flag. Previously `argv[++i]` could silently capture a flag name as the feed URL or pass `undefined` to `resolve()`.
- **`src/core/parser.js`** — `isoDate` is now produced by `safeIsoDate()`, which normalises raw RFC 2822 / non-standard date strings to ISO 8601 via `new Date().toISOString()`. Previously `isoDate` was set to the raw `pubDate` string, breaking any consumer that relied on ISO 8601 format.
- **`src/core/parser.js`** — Removed double assignment of `contentSnippet`. The field was set in the object literal then unconditionally overwritten 10 lines later; the first assignment was dead code.
- **`src/core/parser.js`** — Added `<form>` and `<embed>` to the `stripHtml` block-removal pass, closing an XSS surface where `onsubmit=` or `src=javascript:` vectors could survive into `contentSnippet` when rendered by a downstream consumer.
- **`src/mcp/server.js`** — Fixed tool `description` fields to describe what each tool does, not what the `url` parameter is. LLM agents use `tool.description` for tool selection; incorrect descriptions caused wrong tool routing.

---

## [1.1.0] — 2026-06-23

### Fixed (Critical)

- **`src/fetch-article.js`** — Replaced raw `fetch()` with `fetchTextWithRedirects()`. An unbounded `response.text()` with no timeout, redirect cap, or size guard could OOM the process on a large or malicious response. Now shares the same 10 s timeout, max-5-redirect cap, and HTTP/HTTPS protocol enforcement as the rest of the HTTP layer.
- **`src/agent.js`** — Exported `heuristicAnalyze`. The function was used internally and imported by `adapters/provider.js` after the deduplication refactor in 1.0.8, but was never exported — causing a silent `undefined` at runtime when using the heuristic provider.

### Fixed (Medium)

- **`src/mcp/server.js`** — Resolved `dbPath` using `import.meta.url` instead of a CWD-relative string literal. When launched by Claude Desktop, Cursor, VS Code, or any other MCP host the CWD is unpredictable; the DB was being created in a random or permission-denied location.
- **`src/mcp/server.js`** — Fixed both tool `description` fields. They previously described the `url` parameter, not the tool action. LLM agents use `tool.description` for tool selection — incorrect descriptions cause wrong tool routing.
- **`src/compat.js`** — Resolved `dbPath` using `import.meta.url` (same fix as MCP server).
- **`src/compat.js`** — Removed dead `xml2js` config key. It was merged and forwarded through `parserOptions` but never read by the XML parser engine, creating a confusing migration surface for users coming from the original `rss-parser`.

### Fixed (Low / Compliance)

- **`src/parser.js`** — Removed unnecessary `await` on `parseFeedXml`, which has been synchronous since 1.0.8.
- **`src/fetch-article.js`** — Corrected user-agent placeholder (`example.local`) to the real package GitHub URL, consistent with `src/core/http.js`.
- **`package.json`** — Fixed `lint` script to syntax-check all source files, not just `src/cli.js`.
- **`package.json`** — Added `"socket"` ignore declaration to suppress socket.dev false-positive alerts for intentional `process.env` access and outbound network calls (user-controlled LLM auth).
- **`package.json`** — Added `types` path to the `./mcp` export condition.

### Added

- **`src/mcp/server.d.ts`** — New dedicated type declarations for the `./mcp` package export. Previously `import ... from 'agentic-rss-parser/mcp'` returned `any` for TypeScript consumers.
- **`src/index.d.ts`** — Added named interfaces `AnalysisResult`, `AgenticParserConfig`, `AnalyzerConfig`, `ParseFeedConfig`; added `heuristicAnalyze` export signature; removed dead `xml2js` field from `ParserOptions`; tightened return types from `unknown` to `AnalysisResult` throughout.

---

## [1.0.8] — 2026-06-23

### Changed

- **Zero-Dependency Refactor** — Removed all external production dependencies (`fast-xml-parser`, `zod`, `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@modelcontextprotocol/sdk`).
- **Custom XML Engine** — Integrated a secure, non-recursive, character-by-character scanner parser. Protected against XXE and Billion Laughs.
- **Native Providers & Server** — Built custom OpenAI/Anthropic native fetch adapters and a custom stdio JSON-RPC MCP server.
- **Bug Fix** — Fixed a link normalisation bug where self-closing and attribute-based RSS/Atom links were resolved as raw objects rather than strings when using default options.

## [1.0.7] — Bug fixes and enhancements.

## [1.0.6] — Bug fixes and enhancements.

## [1.0.5] — Bug fixes and enhancements.

## [1.0.4] — Bug fixes and enhancements.

## [1.0.3] — Bug fixes and enhancements.

## [1.0.2]

- Prepared the package for pnpm publication with supply-chain hardening and reproducible lockfiles.
- Added enterprise-oriented repo hygiene, security, and publishing documentation.

## [1.0.1]

### Added

- From-scratch RSS and Atom parsing with a compatibility layer for `rss-parser`-style usage.
- Agentic analysis pipeline with deduplication, enrichment, and provider adapters.
- MCP-ready tooling and CLI entrypoints.
- Realistic RSS and Atom fixture coverage.

### Changed

- Replaced the old XML stack with `fast-xml-parser`.
- Updated the public package surface and release metadata.
