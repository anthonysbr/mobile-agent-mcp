# Contributing

## Setup

```bash
pnpm install
pnpm check   # lint + typecheck + test + build
```

`pnpm format` rewrites files with Biome. CI runs `pnpm check` on every push and PR, so run it before opening one.

## Versioning

Semantic versioning:

- **patch**: bug fix, no API change
- **minor**: new feature, backwards compatible
- **major**: breaking change

Log every user-facing change under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md) as you go.

## Cutting a release

1. Move the `Unreleased` notes into a new `## [x.y.z]` section with today's date.
2. Bump the version: `npm version <patch|minor|major>` (tags the commit).
3. `pnpm check` must be green.
4. `git push --follow-tags`.
5. `npm publish` (the `prepublishOnly` build runs automatically).
