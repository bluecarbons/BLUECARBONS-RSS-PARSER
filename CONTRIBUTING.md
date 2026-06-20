# Contributing

Thanks for helping improve `agentic-rss-parser`.

This project follows a lightweight but standard open-source workflow:

- keep changes focused and reviewable
- add or update tests for behavior changes
- preserve compatibility unless a breaking change is intentional and documented
- prefer clear documentation alongside code changes
- avoid unnecessary dependency growth

## Local setup

```bash
npm install
npm test
```

## Before You Open a PR

- run `npm test`
- run `npm audit`
- make sure `README.md` and `CHANGELOG.md` stay accurate if the public surface changes
- include a concise summary of user impact in the PR description

## What to contribute

- parser improvements
- provider adapters
- MCP compatibility
- feed normalization and deduplication improvements
- docs, examples, and tests

## Guidelines

- keep the public API stable
- add tests for behavior changes
- prefer small, focused changes
- avoid adding heavyweight dependencies unless they clearly improve the library
- document any compatibility tradeoffs in the PR
- follow the existing code style and naming patterns
