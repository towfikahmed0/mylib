# Palette's Journal - My Lib

## 2026-03-13 - [Accessibility & Micro-Interactions]
**Learning:** In a single-file SPA with complex modal templates rendered via JS, it's easy to overlook basic HTML accessibility like `<label for="...">` and auto-focus. Adding these significantly improves the "polish" of the app. Implementing loading states on buttons prevents double-submissions in async Firebase operations.
**Action:** Always check modal templates for label-input associations and ensure the primary input is focused on open. Use `btn.disabled = true` and `btn.innerText = '...'` for all async actions.

## 2026-03-14 - [Global State for Modals & Shortcuts]
**Learning:** In applications with multiple global keyboard shortcuts (like `/` for search and `Escape` for close), managing an active modal state via a global close handler ensures that shortcuts don't conflict. Implementing "click-to-copy" for secondary metadata like ISBN, combined with immediate toast feedback, provides a high-value utility for users who frequently manage book data.
**Action:** Use a `currentModalCloseHandler` variable to track the active modal. Gate global shortcuts by checking this handler. Always provide haptic/visual feedback (toasts) for clipboard actions.

## 2025-05-14 - [Keyboard Accessibility for Card-based UIs]
**Learning:** For interactive card elements that trigger details or actions, adding `tabindex="0"` and `role="button"` is not enough; a global `keydown` listener for `Enter`/`Space` is required for parity with mouse clicks. Additionally, using `group-focus-within:opacity-100` on hover-only actions within cards ensures they remain accessible to keyboard users when they navigate into the card.
**Action:** Always pair `tabindex="0"` on cards with a keyboard listener and ensure hover-states for sub-actions are also triggered by focus.

## 2025-05-20 - [Semantic Interactive Elements & Focus Rings]
**Learning:** Attaching `onclick` handlers to non-semantic elements like `<span>` or `<div>` (e.g., for filters or tags) creates an accessibility gap where keyboard users cannot interact with or even see these elements. Converting them to `<button>` elements with `focus-visible:ring-2` provides immediate keyboard support and visual feedback without requiring custom JavaScript listeners.
**Action:** Always use `<button>` for interactive data filters and tags. Ensure every interactive element has a clear `focus-visible` state.

## 2025-05-22 - [Responsive Summary Cards & Decorative Icons]
**Learning:** In text-heavy summary cards (like library insights), using responsive padding (`p-3` to `p-6`) and responsive font sizes (`text-xl` to `text-4xl`) is critical to prevent overflow on mobile devices. Additionally, "watermark" style background icons with low opacity (`opacity-5`) and scale-on-hover effects (`group-hover:scale-110`) provide visual delight and section context without compromising readability.
**Action:** Use responsive scaling for large numbers in summary components. Add subtle decorative icons to background layers to enhance visual hierarchy.

## 2025-05-24 - [Interactive Data Cards & Content-Aware Labels]
**Learning:** In high-density feeds like an Activity Log, converting individual row items into interactive cards significantly improves touch/click targets. By shifting click handlers to the container and stripping HTML tags to generate `aria-label` values, we provide screen reader users with concise, meaningful summaries of complex nested data (e.g., "User added Book Title") without redundant focus stops.
**Action:** Use full-card interaction for feed items. Generate text-only `aria-label` attributes from template content to ensure semantic clarity for non-visual users.
