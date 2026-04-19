# Contributing

## Ground rules

- Keep Markdown narrative and machine-readable data in sync.
- Do not publish new approved assets without both a manifest and a doc page.
- Prefer semantic token references over copying raw values.
- Treat accessibility metadata as required product data, not optional commentary.

## Development

```bash
npm install
npm run validate
npm run catalog
```

## Pull request checklist

- updated docs if behavior or policy changed
- updated schemas if new required fields were introduced
- updated manifests for changed assets
- updated catalog output if asset inventory changed
- changelog entry for externally meaningful changes

## Commit style

Conventional Commits are recommended:

- `feat:`
- `fix:`
- `docs:`
- `chore:`
- `refactor:`
