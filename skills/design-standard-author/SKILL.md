# Design Standard Author

Use this skill when authoring or updating an enterprise design repository based on this standard.

## Goals

- keep narrative docs, manifests, and tokens aligned
- prefer semantic IDs and token references
- make accessibility obligations explicit

## Workflow

1. Update `DESIGN.md` or the relevant asset doc first so intent is clear.
2. Add or update the matching manifest in `manifests/assets/`.
3. Add or update tokens in `tokens/` only when the value is reusable.
4. Run validation and catalog generation before finalizing changes.

## Required outputs

- doc page for every approved non-trivial asset
- manifest for every approved non-trivial asset
- token references for reusable design decisions
- changelog entry for meaningful public changes
