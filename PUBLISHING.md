# Publishing Guide

This document covers the full release process for `agentic-rss-parser`.

---

## Pre-release Checklist

- [ ] All tests pass: `npm test`
- [ ] All files lint cleanly: `npm run lint`
- [ ] `CHANGELOG.md` has a new entry for the version being released
- [ ] `package.json` version is bumped (follow semver — see below)
- [ ] Examples in `examples/` are tested and working
- [ ] README.md is updated if the public API changed
- [ ] `src/index.d.ts` is updated if new exports were added
- [ ] No secrets, debug output, or TODO comments in staged files

---

## Version Bump Guide (Semver)

| Change type | Version bump | Example |
|---|---|---|
| Breaking API change | **major** `X.0.0` | Removing a public export |
| New public API, new option, new example | **minor** `1.X.0` | Adding `userAgent`, `signals`, new SDK example |
| Bug fix, security patch, dependency update | **patch** `1.1.X` | Fixing a crash, closing a security gap |

Edit `package.json` → `"version"` directly. Do not use `npm version` (it creates an unwanted git tag).

---

## Release Steps

### 1. Bump version in `package.json`

```json
"version": "1.2.0"
```

### 2. Update `CHANGELOG.md`

Add a new section at the top:

```md
## [1.2.0] — YYYY-MM-DD

### Added
- ...

### Fixed
- ...

### Security
- ...
```

### 3. Run the full test and lint suite

```bash
npm test
npm run lint
```

Both must pass cleanly before proceeding.

### 4. Commit and tag

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v1.2.0"
git tag v1.2.0
git push origin main --tags
```

### 5. Publish to npm

**Using npm:**
```bash
npm run release:npm
```

**Using pnpm (preferred — reproducible lockfile):**
```bash
npm run release:pnpm
```

The `release:pnpm` script passes `--no-git-checks` so pnpm does not require a clean working tree.

---

## First-Time npm Setup

If this is your first publish:

```bash
npm login
# Verify you are logged in as the package owner:
npm whoami
```

The package is scoped as `"publishConfig": { "access": "public" }` in `package.json`, so no `--access public` flag is needed beyond the scripts.

---

## What Gets Published

Controlled by the `"files"` array in `package.json`:

```
bin/           CLI entry points
src/           All source and type declaration files
examples/      SDK integration examples
README.md
SUPPORT.md
SECURITY.md
CODE_OF_CONDUCT.md
CHANGELOG.md
LICENSE
CONTRIBUTING.md
```

Files **not** included in the published package (handled by `.npmignore`):
- `test/`
- `.github/`
- `BRANCH_PROTECTION_CHECKLIST.md`
- `GITHUB_REPO_SETTINGS.md`
- `RELEASE_CHECKLIST.md`
- `PUBLISHING.md` (this file)

---

## Canary / Pre-release

To publish a pre-release for testing:

```bash
# Bump version to e.g. 1.3.0-beta.0
# Then:
npm publish --tag beta --access public
# Install with: npm install agentic-rss-parser@beta
```

---

## Post-release

- Verify the release on [npmjs.com/package/agentic-rss-parser](https://www.npmjs.com/package/agentic-rss-parser)
- Check that the GitHub tag and release notes are visible
- Test installation in a fresh directory: `mkdir /tmp/test-install && cd /tmp/test-install && npm install agentic-rss-parser`
