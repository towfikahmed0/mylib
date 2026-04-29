## 2025-04-22 - Standardizing Modal Feedback
**Learning:** In a single-file SPA with heavy use of `innerHTML` for modal transitions, it's critical to use `finally` blocks for all async button actions. This ensures that buttons are re-enabled and their text is restored if a Firestore operation fails, preventing the UI from becoming permanently "stuck" in a loading state.
**Action:** Always wrap async DOM event listeners in `try/catch/finally` and store original button text/HTML before disabling.

## 2025-04-22 - Focus Visibility for Dynamic Elements
**Learning:** Dynamic elements injected via `innerHTML` (like filter removal buttons or modal controls) often lose standard browser focus styling or are overlooked. Using `focus-visible:ring-2` with `outline-none` provides a high-contrast indicator for keyboard users without affecting the aesthetic for mouse users.
**Action:** Apply standardized `focus-visible` rings to all buttons that are generated or shown dynamically in response to state changes.
