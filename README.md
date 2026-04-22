# Enterprise Design Spec

**The design token operating system for teams that ship.** Turn design decisions into machine-readable tokens, automate governance in CI, and keep your brand consistent across every surface — from production UIs to marketing to email to packaging.

---

## The problem

Every team has this problem eventually:

- Designers change a color hex in Figma. Three engineers update it in five different codebases. One forgets.
- A new brand system launches. Six months later, three different button blues are in production.
- The accessibility audit fails because nobody knew `--color-text-inverse` was `#FFFFFF` on white.
- A new hire asks "what's our border radius scale?" and nobody has an answer that matches the code.

Design tokens were supposed to fix this. But most token systems:

- Live in one repo and nobody maintains them
- Have no automation to catch drift
- Export to one format only
- Don't encode accessibility guarantees
- Have no story for multi-brand, multi-theme products

**`enterprise-design-spec`** solves all of it.

---

## What you get

| Layer | What it is | Why it matters |
|-------|-----------|----------------|
| **Tokens** | DTCG-style design tokens with semantic alias chains | One change propagates everywhere automatically |
| **Asset manifests** | Machine-readable records for every logo, icon, font, and image | Teams always know who owns an asset, where it's approved, and how to export it |
| **DESIGN.md** | Human + AI-readable design narrative | Agents make decisions consistent with your brand, not generic defaults |
| **CLI** | 21 commands for validation, export, contrast checking, and automation | Governance runs in CI without manual effort |
| **GitHub Actions** | PR validation, release publishing, and docs deploy out of the box | Zero-configuration CI that prevents bad tokens from reaching production |
| **Skills** | Reusable AI/agent prompts for design authors and reviewers | Scale design ops to autonomous agents |

---

## Quality you can trust

Freshly checked against every command in this repo:

```
✅ 151 core tokens     — 100% healthy, 0 broken aliases
✅ 235 Nexus brand tokens — full violet/slate brand system, 100% healthy
✅ 16 semantic aliases — all resolve correctly through their chain
✅ 7 WCAG pairs        — all pass AA (≥4.5:1) and AAA (≥7:1) contrast
✅ 4 token files       — all pass schema validation + format check
✅ 21 CLI commands     — all tested and working
✅ 0 external services  — everything runs locally, no API keys required
```

This isn't aspirational documentation. Run the commands yourself:

```bash
npm run validate   # schema + reference validation
npm run contrast  # WCAG 2.2 AA/AAA contrast checks
npm run aliases   # detect circular/broken token references
npm run format -- --check  # catch token formatting drift
npm run dashboard # see your token health score
```

---

## Who this is for

**Design systems teams** who need a structured standard their whole org can build on — not just a Figma file that engineers ignore.

**Brand teams** managing multiple products or sub-brands that need to stay consistent without a dedicated design eng team.

**Product teams** shipping to web, mobile, email, and print who need the same design decisions expressed in CSS, Swift, Kotlin, and XML without manual translation.

**AI agent workflows** where autonomous agents need machine-readable design rules — not just vibes from a screenshot.

**Platform teams** standardizing design across dozens of squads who are all currently doing their own thing.

---

## HOW: Ship a design token system in 10 minutes

### 1. Clone and init

```bash
git clone https://github.com/Ola-Turmo/enterprise-design-spec.git
cd enterprise-design-spec
npm install
```

### 2. See what you have

```bash
npm run validate    # checks all token files, manifests, and docs
npm run dashboard  # terminal UI showing your token health score
npm run visualize  # ASCII preview of your color scales and typography
```

### 3. Export to your platforms

```bash
npm run export          # CSS custom properties + SCSS + Tailwind + JSON
npm run export -- --format css,tailwind  # just what you need
```

### 4. Add your brand colors (takes 2 minutes)

Edit `tokens/core/primitives.tokens.json`. Add your palette under `color.brand`. Reference it from `tokens/core/semantic.tokens.json` under `color.brand.*`. Done — the export pipeline picks it up automatically.

### 5. Enforce it in CI

```bash
# This blocks any PR that introduces broken tokens
npm run validate && npm run contrast && npm run aliases
```

The GitHub Actions workflow runs this automatically on every PR. No configuration needed — it's in `.github/workflows/pr-bot.yml`.

### 6. Keep it in sync with Figma (optional)

```bash
FIGMA_PERSONAL_ACCESS_TOKEN=xxx FIGMA_FILE_KEY=yyy npm run figma:pull
```

Tokens flow from Figma Variables → local JSON → your CI pipeline. No manual exports.

---

## The CLI at a glance

### Core validation

| Command | What it does |
|---------|-------------|
| `validate` | Schema + `tokenRefs` validation — catches broken links and bad types |
| `aliases` | Resolves full alias chain + detects circular references |
| `contrast` | WCAG 2.2 contrast checks — AA, AAA, large text, UI components |
| `format` | Auto-sort + validate token JSON — prevents formatting drift in PRs |

### Export and consumption

| Command | What it does |
|---------|-------------|
| `export` | CSS custom properties, SCSS, Tailwind config, DTCG JSON |
| `types` | Generate TypeScript types from token structure |
| `figma pull` | Pull tokens from Figma Variables API into local JSON |
| `figma push` | Push local tokens up to Figma |

### Automation

| Command | What it does |
|---------|-------------|
| `watch` | File watcher — auto-regenerates outputs the moment you save a token file |
| `dashboard` | Terminal UI — token health score, alias coverage, breakdown by type/group |
| `changelog` | Reads git history → human-readable diff of what tokens changed |
| `diff-viewer` | Standalone HTML before/after diff between two commits |
| `monorepo` | Scans entire workspace for multiple brand systems — parallel builds |
| `prepublish` | Pre-release checklist — validates package.json, exports, README, assets |
| `lint-commit` | Enforces Lore Commit Protocol on commit messages |

### Design and authoring

| Command | What it does |
|---------|-------------|
| `visualize` | ASCII color palette bars, typography specimens, spacing scales |
| `catalog` | Generates a machine-readable asset inventory from manifests |
| `init` | Scaffold a new brand system with one command |
| `playground` | Standalone HTML token browser — share a live preview without a build |

### Local automation

```bash
# Install the pre-commit hook — blocks any commit with broken tokens
npx husky install

# Watch mode — live reload during design iteration
npm run watch

# Multi-brand parallel build
npm run monorepo

# Quick health check (good for CI step)
npm run validate && npm run aliases && npm run contrast
```

---

## Style Dictionary integration

Tokens are processed through **Style Dictionary v5** + `@tokens-studio/sd-transforms` for production-grade cross-platform output:

```bash
npm run export:all
# Produces:
#   dist/tokens/tokens.css          — CSS custom properties
#   dist/tokens/_tokens.scss        — SCSS variables
#   dist/tokens/tokens.tailwind.js  — Tailwind config
#   dist/tokens/tokens.export.json  — Expanded DTCG JSON
```

---

## npm package

Install as a dependency to consume tokens directly in your app:

```bash
npm install enterprise-design-spec
```

```js
import tokens from "enterprise-design-spec/tokens";
import semanticTokens from "enterprise-design-spec/tokens/semantic";

// Full token with all aliases resolved
console.log(tokens.color.brand.primary.value); // #7C3AED
console.log(semanticTokens.color.text.default.value); // #0F172A
```

---

## Recommended GitHub setup

- enable branch protection on `main`
- require the `validate`, `contrast`, and `aliases` checks to pass before merge
- keep `CODEOWNERS` active for `docs/`, `tokens/`, `manifests/`, and `skills/`
- publish generated docs and catalogs from tags or release branches
- tag releases with `vX.Y.Z` to trigger npm publish + GitHub Release automatically

---

## Skills for AI agents

Three production-ready agent skills included:

| Skill | What it does |
|-------|-------------|
| `design-standard-author` | Create and update design-system source artifacts |
| `asset-manifest-reviewer` | Review manifests, docs, and accessibility metadata |
| `stitch-design-migration` | Expand Stitch-only `DESIGN.md` files into the full standard |

---

## References

Official source links that shaped the standard are in [docs/references/sources.md](./docs/references/sources.md).

---

## License

[MIT](./LICENSE)
