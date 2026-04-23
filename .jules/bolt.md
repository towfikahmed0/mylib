# Bolt's Journal - My Lib Performance Learnings

## 2025-05-15 - [Optimization] Incremental Firestore Sync & Fast Sorting

**Learning:** In a single-file SPA with large Firestore collections, re-processing the entire data set on every snapshot change (O(N)) causes significant UI lag as the library grows. Additionally, `String.prototype.localeCompare` is a known bottleneck when used inside high-frequency sort/render loops.

**Action:**
1. Use `snapshot.docChanges()` to implement incremental updates with a persistent `Map` (e.g., `chunkedBooksMap`). This transforms data synchronization from O(N) to O(1) for most updates.
2. Pre-calculate sort keys (e.g., `_sortTitle`, `_sortAuthor`) during data normalization to allow for direct string comparisons (`<`, `>`), which are significantly faster than `localeCompare` during list rendering.
3. Cache external references (like user profile names) in a local `userProfileCache` to avoid redundant Firestore lookups during the render cycle.
