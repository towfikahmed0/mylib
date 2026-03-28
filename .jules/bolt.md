# Bolt's Journal ⚡

## 2025-05-14 - [Initial Assessment]
**Learning:** The application is a single-file SPA using vanilla JS and Firestore. It already has several manual optimizations (pre-normalization, star cache, metadata cache). However, the library rendering path (`renderLibraryOnly`) remains a potential bottleneck as it performs full filtering and sorting on every keystroke, including an O(N*M) check for AI filters and multiple slow `localeCompare` calls.
**Action:** Optimize the filtering loop with early returns and O(1) AI filter lookups (using Set). Replace `localeCompare` with `Intl.Collator` for a significant boost in sorting large collections.

## 2025-05-14 - [String Comparison & Set Optimization]
**Learning:** `Intl.Collator` is significantly faster than `localeCompare` for sorting operations in large collections because it avoids repeated locale resolution. Additionally, `Set.has` provides O(1) lookups for AI filtering, preventing O(N*M) performance degradation during search.
**Action:** Use a global `Intl.Collator` for all sort functions and wrap filter arrays in `Set` for high-frequency lookup paths.

## 2025-05-14 - [Hoisting & Caching in Render Loops]
**Learning:** Redundant calls to `isAnyFilterActive()` (O(N) check) and post-render DOM scans to update cached contributor names (O(N*M)) were identified as major bottlenecks in `renderLibraryOnly`.
**Action:** Hoist O(N) checks outside of rendering loops and use cached data (like `userProfileCache`) directly during HTML string generation to eliminate expensive DOM lookups.

## 2025-05-14 - [The Attribute Escaping Trap]
**Learning:** Escaping strings for HTML attributes that contain JavaScript (like `onclick`) is tricky. Standard HTML escaping (`'` to `&#39;`) breaks JavaScript's ability to handle apostrophes in string literals.
**Action:** Always escape single quotes for JavaScript (replace `'` with `\'`) *before* wrapping the entire string in `escapeHTML()` when injecting data into `onclick` handlers.

## 2025-05-14 - [Pre-rendering UI Fragments in Cache]
**Learning:** In a vanilla JS application using large template literals for rendering, the overhead of repeated `.map()` and `.join()` operations for small UI fragments (like tags) inside the main render loop can become significant as the collection grows.
**Action:** Pre-render these HTML fragments once during the data-processing/cache-update phase (`updateLibraryCache`) and store them in the `_cache` object. This transforms O(N * M) string operations into O(1) lookups during the critical render path.
