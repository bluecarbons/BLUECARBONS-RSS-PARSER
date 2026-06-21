# Release Checklist

Use this checklist before publishing a new version to npm or pnpm.

## Code

- [ ] `npm test`
- [ ] `npm audit`
- [ ] confirm Node.js support policy is still accurate
- [ ] check examples still reflect the public API

## Package

- [ ] `npm pack --dry-run`
- [ ] `npm publish --dry-run`
- [ ] `pnpm publish --dry-run --access public`
- [ ] verify `package.json` repository and homepage URLs
- [ ] verify `files` and `.npmignore` include the intended publish surface

## Docs

- [ ] update `CHANGELOG.md`
- [ ] update `README.md` if the public API changes
- [ ] update `SECURITY.md` if the threat model changes

## Publish

- [ ] publish to npm
- [ ] publish to pnpm-compatible registry flow if needed
- [ ] tag the release in git
- [ ] create or update the GitHub release notes
