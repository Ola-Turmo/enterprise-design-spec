# Enterprise Design Spec

`enterprise-design-spec` is an open-source standard and toolkit for turning Stitch-style `DESIGN.md` files into a complete enterprise design operating system.

It combines four layers:

- `DESIGN.md` and narrative docs for human and agent guidance
- DTCG-style tokens for machine-readable design decisions
- asset manifests for lifecycle, ownership, accessibility, and export metadata
- validation and catalog code so teams can automate governance in CI

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
- [`src/`](./src): validator and catalog CLI
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
npm run validate
npm run validate -- --root examples/minimal-brand-system
npm run catalog
npm run catalog -- --root examples/minimal-brand-system --output releases/example-catalog.json
```

## Included skills

- `skills/design-standard-author`: create or update design-system source artifacts
- `skills/asset-manifest-reviewer`: review manifests, docs, and accessibility metadata
- `skills/stitch-design-migration`: expand Stitch-only `DESIGN.md` files into the full standard

## Recommended GitHub setup

- enable branch protection on `main`
- require the `validate` workflow
- keep `CODEOWNERS` active for `docs/`, `tokens/`, `manifests/`, and `skills/`
- publish generated docs and catalogs from tags or release branches

## References

Official source links that shaped the standard are collected in [docs/references/sources.md](./docs/references/sources.md).

## License

[MIT](./LICENSE)
