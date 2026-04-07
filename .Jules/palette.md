# Palette's Journal - My Lib

## 2026-04-12 - [Accessible Interactive Triggers & Navigation Feedback]
**Learning:** In highly interactive SPAs, micro-feedback for filtering actions (like scrolling to top) is essential to confirm the state change. Additionally, functional buttons (like status cycling) need clear, predictive ARIA labels to be usable by screen-reader users. Standardizing ARIA progress attributes on visual bars ensures data transparency across all assistive technologies.
**Action:** Always implement `window.scrollTo({ top: 0, behavior: 'smooth' })` for global filter triggers. Use predictive `aria-label` and `title` attributes (e.g., "Mark as Finished") instead of just describing current state. Ensure all visual progress indicators have `role="progressbar"` and relevant `aria-valuenow` attributes.

## 2026-04-13 - [Semantic Form Controls & Input Polish]
**Learning:** Using generic `<span>` elements as labels for form controls (like `<select>` filters) prevents screen readers from correctly identifying their purpose. Additionally, standard browser behaviors like autocomplete and spellcheck can interfere with application-specific "smart search" inputs, creating visual clutter or overlapping UI.
**Action:** Always use semantic `<label>` elements with a `for` attribute matching the input `id`. For custom-filtered search inputs, apply `autocomplete="off"` and `spellcheck="false"` to ensure a focused, interference-free user experience.
