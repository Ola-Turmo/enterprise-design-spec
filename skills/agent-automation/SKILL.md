# Design System Agent Automation

Automated workflows for AI agents to maintain and evolve an enterprise design system without human intervention.

## Auto-Manifest Generator

When a new asset file appears in `docs/assets/` or `assets/`:

1. Scan the file for metadata (dimensions, format, size)
2. Generate a matching `manifests/assets/<id>.asset.json` with:
   - Auto-detected `assetType` and `subtype` from filename pattern
   - Default `status: "draft"` and `maturity: "experimental"`
   - Empty `owners` and `accessibility` for human review
3. Run `npm run validate` to verify schema compliance

## Auto-Doc Generator

When a new manifest appears without a matching doc page:

1. Create `docs/assets/<family>/<asset>.mdx` from the template
2. Populate front matter from manifest fields
3. Add placeholder sections: Purpose, Approved usage, Do not use, Variants, Exports, Accessibility, Governance, Changelog
4. Run `npm run validate`

## Token Change Detector (PR Bot)

On pull requests with token changes:

1. Run `npm run diff -- --base main --head HEAD` to identify changes
2. Classify changes:
   - **Breaking**: primitive value changes, token removals → `MAJOR`
   - **Additive**: new tokens, new variants → `MINOR`
   - **Non-breaking**: metadata fixes → `PATCH`
3. Comment on PR with:
   - List of changed tokens with old/new values
   - Suggested semver bump
   - Affected exports (CSS/SCSS/Tailwind diffs)

## Contrast Audit

After any token change affecting colors:

1. Run `npm run contrast`
2. If failures detected:
   - Flag the PR with failing pairs
   - Suggest adjusted values that would pass
3. Block merge if `--target` threshold not met

## Alias Health Check

After any token file modification:

1. Run `npm run aliases`
2. If circular or broken refs detected:
   - Flag the specific token path and alias chain
   - Suggest the correct target

## Scheduled Audit (cron)

Weekly autonomous audit:

1. Clone all repos using this standard
2. Run `validate`, `contrast`, `aliases` on each
3. Generate health report:
   - Pass/fail per repo
   - Drift between catalog and actual assets
   - Stale assets (no updates in 90+ days)
4. Post report to designated channel
