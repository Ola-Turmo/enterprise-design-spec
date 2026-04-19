# Asset Manifest Reviewer

Use this skill to review whether design docs and manifests are internally consistent.

## Review checklist

- schema validity
- matching `id` between doc page and manifest
- clear ownership and lifecycle state
- explicit export profiles
- realistic accessibility metadata
- valid `tokenRefs`

## Default stance

Flag ambiguity. A manifest that is technically valid but operationally vague should still be considered incomplete.
