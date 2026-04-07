# Palette's Journal - My Lib

## 2026-03-13 - [Accessibility & Micro-Interactions]
**Learning:** In a single-file SPA with complex modal templates rendered via JS, it's easy to overlook basic HTML accessibility like `<label for="...">` and auto-focus. Adding these significantly improves the "polish" of the app. Implementing loading states on buttons prevents double-submissions in async Firebase operations.
**Action:** Always check modal templates for label-input associations and ensure the primary input is focused on open. Use `btn.disabled = true` and `btn.innerText = '...'` for all async actions.

## 2026-03-14 - [Global State for Modals & Shortcuts]
**Learning:** In applications with multiple global keyboard shortcuts (like `/` for search and `Escape` for close), managing an active modal state via a global close handler ensures that shortcuts don't conflict. Implementing "click-to-copy" for secondary metadata like ISBN, combined with immediate toast feedback, provides a high-value utility for users who frequently manage book data.
**Action:** Use a `currentModalCloseHandler` variable to track the active modal. Gate global shortcuts by checking this handler. Always provide haptic/visual feedback (toasts) for clipboard actions.
