## 2025-05-14 - Interactive Filtering and Search Feedback
**Learning:** In dynamic, filterable interfaces, providing immediate visual feedback for interaction states (like fading a search hint on focus) and clear, accessible labels for filter removal actions significantly improves discoverability and keyboard navigation. Passive cards should be elevated to interactive buttons with proper focus rings to ensure consistent accessibility.
**Action:** Always verify that every interactive filter element (tags, removal icons, search clear) has a descriptive ARIA label and a visible focus indicator (`focus-visible:ring-2`). For input hints, use CSS `group-focus-within` patterns to handle visibility transitions without JavaScript overhead.

## 2025-05-15 - Improving Discoverability of Hover-Only Actions
**Learning:** Interactive elements that are conditionally visible only on hover (e.g., delete icons on highlights) are completely inaccessible to keyboard users. Using `group-focus-within:opacity-100` allows these elements to become visible when a user tabs into the container or the button itself, restoring functionality for keyboard and screen reader users.
**Action:** For any element that uses `group-hover:opacity-100`, always pair it with `group-focus-within:opacity-100` and ensure the hidden interactive element has a descriptive `aria-label` and visible focus indicator (`focus-visible:ring-2`).

## 2026-04-25 - Async Button Feedback and Keyboard Shortcuts
**Learning:** For destructive or time-consuming operations like book deletion, a multi-stage visual confirmation (disabling the button and changing text to "Deleting...") prevents user anxiety and duplicate requests. Additionally, ensuring all modal inputs (like highlight entries) support standard keyboard shortcuts like 'Enter' makes the interface feel more responsive and professional.
**Action:** Always implement a loading state for primary async action buttons. Ensure all text inputs within modals have an associated 'Enter' key listener to trigger the primary action of that section.
