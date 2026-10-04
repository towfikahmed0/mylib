# General Preferences

- In multi-user features (collaborators/shared libraries), destructive operations must be scoped to the acting user's own data and must never touch other users'/collaborators' data — this is stated as an explicit requirement whenever deletions or data wipes are requested. Confidence: 0.5
- When a feature aggregates other users' data (e.g. counting active collaborators' books into Insights totals), expects the aggregation to be an explicit user-facing option/control (a toggle to include or exclude it), and wants totals scoped to the live/active state (e.g. only *active* collaborations). Confidence: 0.45
