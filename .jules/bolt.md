# Bolt's Journal ⚡

## 2025-05-14 - [Initial Assessment]
**Learning:** The application is a single-file SPA using vanilla JS and Firestore. It already has several manual optimizations (pre-normalization, star cache, metadata cache). However, the library rendering path (`renderLibraryOnly`) remains a potential bottleneck as it performs full filtering and sorting on every keystroke, including an O(N*M) check for AI filters and multiple slow `localeCompare` calls.
**Action:** Optimize the filtering loop with early returns and O(1) AI filter lookups (using Set). Replace `localeCompare` with `Intl.Collator` for a significant boost in sorting large collections.

## 2025-05-14 - [String Comparison & Set Optimization]
**Learning:** `Intl.Collator` is significantly faster than `localeCompare` for sorting operations in large collections because it avoids repeated locale resolution. Additionally, `Set.has` provides O(1) lookups for AI filtering, preventing O(N*M) performance degradation during search.
**Action:** Use a global `Intl.Collator` for all sort functions and wrap filter arrays in `Set` for high-frequency lookup paths.
