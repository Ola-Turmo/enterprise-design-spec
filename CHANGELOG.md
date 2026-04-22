# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Style Dictionary v5 integration for cross-platform token output (CSS, SCSS, Tailwind, JSON)
- `@tokens-studio/sd-transforms` for DTCG token expansion
- WCAG contrast ratio validation engine using `colorjs.io`
- Token alias resolution engine with circular reference detection
- Token diff command for comparing token sets between versions
- New CLI commands: `contrast`, `export`, `aliases`, `diff`
- GitHub Actions: contrast check, alias check, export artifact jobs
- Release workflow: npm publish + GitHub Release on tag
- npm package publishing with `bin`, `exports`, and `files` fields
- Automated tooling section to DESIGN.md standard

### Changed
- Bumped version from 0.1.0 to 0.2.0
- Updated CI workflow to include contrast, alias, and export jobs
- Expanded README with full CLI reference and npm usage

### Dependencies
- Added `style-dictionary@^5.4.0`
- Added `@tokens-studio/sd-transforms@^2.0.3`
- Added `colorjs.io@^0.5.2`

## [0.1.0] - 2026-04-19

### Added
- Initial release of Enterprise Design Spec
- DESIGN.md standard for AI-readable design documentation
- DTCG-style token sets (primitives + semantic)
- Asset manifest and doc page JSON schemas (Draft 2020-12)
- Validator CLI with AJV schema validation
- Catalog generation CLI
- AI agent skills: design-standard-author, asset-manifest-reviewer, stitch-design-migration
- Example minimal brand system
- GitHub Actions CI workflow
