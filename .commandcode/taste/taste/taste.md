# Taste
- For security fixes, insists on server-side enforcement (e.g. Firestore security rules) rather than client-side-only changes; explicitly calls out that vulnerabilities "must be fixed server-side." Confidence: 0.9
- Prefers the smallest safe change that solves the problem; edits existing files in place (reads the current content first) rather than creating new files or overwriting them from scratch, and does not rewrite large files (e.g. single-file HTML apps) wholesale. Confidence: 0.9
- Do not delete or touch unrelated files (e.g. README.md) as part of a focused task. Confidence: 0.85
- Do not break existing features when making changes; changes must stay compatible with current behavior. Confidence: 0.85
- Wants to review the diff before changes are saved/applied. Confidence: 0.8
- Prefers to handle remaining tasks and testing/verification manually; declines offers to build extra test suites or tooling, so stop once the requested change is delivered. Confidence: 0.6
- Hands off task specifications via a prompt file in the repo (e.g. `prompt.txt`, `prompt2.txt`) and instructs the agent to read and execute it, rather than describing the task inline. Confidence: 0.55
