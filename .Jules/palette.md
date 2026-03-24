# Palette's Journal - My Lib

## 2026-03-13 - [Accessibility & Micro-Interactions]
**Learning:** In a single-file SPA with complex modal templates rendered via JS, it's easy to overlook basic HTML accessibility like `<label for="...">` and auto-focus. Adding these significantly improves the "polish" of the app. Implementing loading states on buttons prevents double-submissions in async Firebase operations.
**Action:** Always check modal templates for label-input associations and ensure the primary input is focused on open. Use `btn.disabled = true` and `btn.innerText = '...'` for all async actions.

## 2026-03-17 - [Interactive Book Cards & Action Feedback]
**Learning:** Book cards rendered in complex SPAs often lack keyboard accessibility. Adding 'tabindex="0"', 'role="button"', and global keydown listeners (Enter/Space) makes the library navigable for all users. Providing micro-feedback on common actions, like swapping an icon to a checkmark after copying to clipboard, reduces user uncertainty.
**Action:** Ensure all interactive card-like elements have proper ARIA roles and keyboard handlers. Use temporary icon/text swaps for high-frequency actions to provide immediate success confirmation.

## 2026-03-18 - [Cross-Tab Navigation & Visual Focus]
**Learning:** In a multi-tab library interface, "Jump to" actions must be context-aware. Switching to the correct tab (e.g., Library vs. Wishlist) before scrolling ensures the user actually sees the target. Combining 'element.scrollIntoView' with 'element.focus()' and a temporary Tailwind 'ring' highlight provides both visual and screen-reader confirmation of the navigation.
**Action:** When implementing "jump to" or "deep link" functionality, always ensure the parent container/tab is active, manage keyboard focus, and use a transient visual highlight to anchor the user's attention.

## 2026-03-22 - [Modal Focus Restoration & Semantic Interactive Triggers]
**Learning:** In highly interactive SPAs with many modals, the lack of focus restoration on modal close disorients keyboard and screen-reader users by returning them to the top of the document. Additionally, using non-semantic elements (spans, paragraphs) as clickable triggers for filters makes features invisible to assistive technologies.
**Action:** Always capture `document.activeElement` before opening a modal and restore focus upon closing. Convert all clickable triggers that are not links into `<button type="button">` elements with descriptive `aria-label` attributes to ensure they are discoverable and focusable.

## 2026-03-23 - [Centralized Filter Feedback & State Visibility]
**Learning:** In a data-heavy application, fragmented filtering feedback (e.g., hidden dropdown values combined with a separate search bar and isolated tag filters) often leaves users confused about why their results are limited. Consolidating all active filter states into a single "active-filters-bar" with clearable chips provides immediate transparency and control.
**Action:** Always implement a central  helper to sync UI elements like results counters ("X of Y found") and empty states. Ensure every active filter is represented as a removable badge to maintain "state visibility" for the user.

## 2026-03-23 - [Centralized Filter Feedback & State Visibility]
**Learning:** In a data-heavy application, fragmented filtering feedback (e.g., hidden dropdown values combined with a separate search bar and isolated tag filters) often leaves users confused about why their results are limited. Consolidating all active filter states into a single "active-filters-bar" with clearable chips provides immediate transparency and control.
**Action:** Always implement a central `isAnyFilterActive` helper to sync UI elements like results counters ("X of Y found") and empty states. Ensure every active filter is represented as a removable badge to maintain "state visibility" for the user.

## 2026-03-24 - [Aesthetic Placeholders & Standardized Async Feedback]
**Learning:** Generic "No Cover" text placeholders detract from the premium feel of a book-focused app. Using serif fonts and background gradients for placeholders maintains the visual rhythm of the library grid. Additionally, consistent "Saving..." states on all settings buttons (profile, AI, sharing) reduces user anxiety during network-bound operations.
**Action:** For missing media, use stylized CSS placeholders that include semantic text (like the item title). Implement a standard "disable + text-swap" pattern for all buttons triggering async Firestore/AI operations.

## 2026-03-25 - [Contextual Empty States & ARIA Progress Indicators]
**Learning:** Generic empty states are missed opportunities for user guidance. In a social/shared library app, the "Activity" feed is useless without partners; providing a direct CTA to "Invite Collaborator" (Settings) converts a "dead end" into a helpful prompt. Additionally, visual charts (bars/rings) are invisible to screen readers without `role="progressbar"` and standard `aria-` value attributes.
**Action:** Always check if an empty state's root cause can be solved by a specific action and provide a direct CTA. Ensure all visual data representations have semantic ARIA roles and labels to maintain data accessibility.

## 2026-03-24 - [Shortcut Scroll-to-Top & Universal Focus Feedback]
**Learning:** In long-scrolling single-page libraries, users often get "lost" deep in a list. Implementing a "shortcut" where clicking an already-active tab triggers a smooth scroll-to-top (mirroring mobile OS patterns) provides a fast way to reset the view. Additionally, interactive text triggers (like author/genre filters) are often invisible to keyboard users; adding standardized 'focus-visible' rings across all such micro-interactions is critical for a truly accessible experience.
**Action:** Always implement a "click active tab to scroll top" pattern in navigation. Ensure all secondary interactive elements (tags, metadata links, clear buttons) have high-visibility focus states that match the app's primary accent color.
