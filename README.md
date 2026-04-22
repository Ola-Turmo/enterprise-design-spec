# Enterprise Design Spec

`enterprise-design-spec` is an open-source standard and toolkit for turning Stitch-style `DESIGN.md` files into a complete enterprise design operating system.

It combines four layers:

- `DESIGN.md` and narrative docs for human and agent guidance
- DTCG-style tokens for machine-readable design decisions
- Asset manifests for lifecycle, ownership, accessibility, and export metadata
- Validation and catalog code so teams can automate governance in CI

This repository is meant to be cloned, adapted, and extended by design systems, brand teams, and product engineering teams that need one source of truth across UI, marketing, social, email, print, packaging, and motion.

## Why this exists

Google Stitch made `DESIGN.md` a practical format for AI-readable design guidance. That solves part of the problem. Enterprise teams still need:

- structured tokens that build into products
- asset manifests that describe ownership, approvals, exports, and usage
- examples that teams can copy
- automation that prevents the standard from drifting

This repo packages all of that into one usable baseline.

## Repo contents

- [DESIGN.md](./DESIGN.md): the normative standard
- [BRAND.md](./BRAND.md): a brand policy companion template
- [`schemas/`](./schemas): JSON schemas for docs and asset manifests
- [`tokens/`](./tokens): example DTCG-style token sets
- [`manifests/assets/`](./manifests/assets): machine-readable asset records
- [`docs/assets/`](./docs/assets): human-readable asset pages
- [`templates/`](./templates): copy-paste starting points for new teams
- [`src/`](./src): validator, catalog, contrast checker, token exporter, and alias resolver CLI
- [`skills/`](./skills): reusable AI/agent skills for authors, reviewers, and migration work
- [`examples/minimal-brand-system/`](./examples/minimal-brand-system): a portable sample implementation

## Quick start

```bash
npm install
npm run validate
npm run catalog
```

The validator checks:

- asset manifest schema compliance
- asset doc frontmatter schema compliance
- missing doc/manifest pairings
- broken `tokenRefs`

The catalog command writes `releases/latest/catalog.json`.

## CLI

```bash
# Validate all assets, tokens, and docs
npm run validate
npm run validate -- --root examples/minimal-brand-system

# Generate asset catalog
npm run catalog
npm run catalog -- --root examples/minimal-brand-system --output releases/example-catalog.json

# Check WCAG contrast ratios for semantic color pairs
npm run contrast
npm run contrast -- --target 7  # AAA level

# Export tokens to CSS, Tailwind, SCSS, and JSON
npm run export
npm run export -- --format css,tailwind
npm run export -- --output ./my-output-dir

# Resolve and validate token aliases (detect circular/broken refs)
npm run aliases

# Compare token sets between two directories
npm run diff -- --base ./tokens-v1 --head ./tokens-v2
```

### CLI Commands

| Command | Description | Flags |
|---------|-------------|-------|
| `validate` | Schema + reference validation | `--root` |
| `catalog` | Generate asset inventory | `--root`, `--output` |
| `contrast` | WCAG contrast ratio checks | `--root`, `--target` |
| `export` | Token → CSS/Tailwind/SCSS/JSON | `--root`, `--output`, `--format` |
| `aliases` | Token alias resolution + circular ref detection | `--root` |
| `diff` | Compare two token sets | `--base`, `--head`, `--root` |
| `types` | Generate TypeScript type definitions | `--root`, `--output` |
| `init` | Scaffold new brand system | `--root`, `--name` |
| `figma` | Sync with Figma Variables | `pull/push`, `--file-key`, `--token`, `--output` |

## Style Dictionary Integration

Tokens are processed through Style Dictionary v5 + `@tokens-studio/sd-transforms` for cross-platform output:

```bash
npm run export:all
# Produces:
#   dist/tokens/tokens.css          — CSS custom properties
#   dist/tokens/_tokens.scss        — SCSS variables
#   dist/tokens/tokens.tailwind.js  — Tailwind config
#   dist/tokens/tokens.export.json  — Expanded DTCG JSON
```

## Included skills

- `skills/design-standard-author`: create or update design-system source artifacts
- `skills/asset-manifest-reviewer`: review manifests, docs, and accessibility metadata
- `skills/stitch-design-migration`: expand Stitch-only `DESIGN.md` files into the full standard

## Recommended GitHub setup

- enable branch protection on `main`
- require the `validate`, `contrast`, and `aliases` workflows
- keep `CODEOWNERS` active for `docs/`, `tokens/`, `manifests/`, and `skills/`
- publish generated docs and catalogs from tags or release branches
- tag releases with `vX.Y.Z` to trigger npm publish + GitHub Release

## npm package

Install as a dependency to consume tokens in your projects:

```bash
npm install enterprise-design-spec
```

```js
import tokens from "enterprise-design-spec/tokens";
import semanticTokens from "enterprise-design-spec/tokens/semantic";
```

## References

Official source links that shaped the standard are collected in [docs/references/sources.md](./docs/references/sources.md).

## License

[MIT](./LICENSE)
