# Workflow

- Works from a written PRD/spec and expects the agent to read it and adhere to its scope before writing code. Confidence: 0.75
- Splits large migrations/builds into explicit phases and delivers incrementally — wants only the current phase built and later logic left out ("do not build X yet"). Confidence: 0.85
- Writes structured task briefs with Context / Goal / Tasks sections and explicit file-level deliverables. Confidence: 0.6
- Wants legacy bugs from the prior implementation carried forward and fixed during a migration (rather than silently dropped). Confidence: 0.55
- Keeps task instructions as documents inside the repo — either one numbered file per phase (e.g. `docs/p2.txt`, `docs/p3.txt`, `docs/p4.5.txt`, `docs/5.txt`, including sub-phases) or a single multi-part brief (e.g. `docs/prompt.txt` with several parts) — and points the agent at them with an `@`-mention ("read @docs\prompt.txt and execute the tasks one-by-one") to read and execute, rather than inlining the request. Confidence: 0.85
- When handed a multi-part task list, expects the agent to work the tasks sequentially one-by-one (part 1, then part 2, …), completing and verifying each before starting the next rather than batching them. Confidence: 0.6
- Expects work to be verified with the project's lint and build (type-check) scripts and the results reported before a phase is declared complete. Confidence: 0.55
- Prefers backend/infra config (Firestore rules and indexes, `firebase.json`) delivered as files to apply manually via the console, and explicitly asks that deploy/CLI commands (e.g. `firebase-tools`) not be run. Confidence: 0.5
- Expects the agent to pause for explicit sign-off on high blast-radius decisions (e.g. Firestore security rules and data-visibility model changes) before implementing, presenting the options with a recommended default rather than deciding unilaterally. Confidence: 0.5
