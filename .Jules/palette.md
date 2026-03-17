# Palette's Journal - My Lib

## 2026-03-13 - [Accessibility & Micro-Interactions]
**Learning:** In a single-file SPA with complex modal templates rendered via JS, it's easy to overlook basic HTML accessibility like `<label for="...">` and auto-focus. Adding these significantly improves the "polish" of the app. Implementing loading states on buttons prevents double-submissions in async Firebase operations.
**Action:** Always check modal templates for label-input associations and ensure the primary input is focused on open. Use `btn.disabled = true` and `btn.innerText = '...'` for all async actions.

## 2026-03-17 - [Interactive Book Cards & Action Feedback]
**Learning:** Book cards rendered in complex SPAs often lack keyboard accessibility. Adding 'tabindex="0"', 'role="button"', and global keydown listeners (Enter/Space) makes the library navigable for all users. Providing micro-feedback on common actions, like swapping an icon to a checkmark after copying to clipboard, reduces user uncertainty.
**Action:** Ensure all interactive card-like elements have proper ARIA roles and keyboard handlers. Use temporary icon/text swaps for high-frequency actions to provide immediate success confirmation.
