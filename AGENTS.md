# Agent Working Agreement

These are current-state maintenance notes, not a claim that the product is complete. Treat source, configuration, and Firestore rules as evidence of what exists; treat [docs/PRD.txt](docs/PRD.txt) as product intent. Read [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md), and [FIRESTORE_SECURITY.md](FIRESTORE_SECURITY.md) when the task touches their areas. Do not infer that a requirement is implemented because it appears in a plan, prompt, or archived file.

## Before Editing

- Inspect the owning implementation, nearby call sites, relevant rules/configuration, and existing documentation before changing behavior.
- Preserve existing user-visible behavior and data contracts unless the request explicitly changes them.
- Keep changes scoped. Avoid unrelated refactors, dependency changes, or broad rewrites.
- For security-sensitive changes, inspect the corresponding Firestore rules as well as client code. Client-side guards are not authorization boundaries.

## UI Scope

- A theme/token-only request changes theme variables or their application; preserve component structure, layout, and interaction behavior.
- A full UI redesign requires an explicit request. Then update the relevant component structure and responsive states while preserving unrelated flows and data behavior.
- Follow the observed styling conventions in [DESIGN.md](DESIGN.md); do not assume a library or design system that is not installed.

## Verification

- Run `npm run build` and `npm run lint` when changes affect application code, types, or configuration. Run narrower relevant checks first when available.
- For documentation-only changes, validate the diff and links where practical; do not change application files just to make a check pass.
- Report checks that were not run and distinguish verified implementation from planned or unverifiable behavior.