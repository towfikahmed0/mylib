# Palette's Journal - My Lib

## 2026-04-12 - [Accessible Interactive Triggers & Navigation Feedback]
**Learning:** In highly interactive SPAs, micro-feedback for filtering actions (like scrolling to top) is essential to confirm the state change. Additionally, functional buttons (like status cycling) need clear, predictive ARIA labels to be usable by screen-reader users. Standardizing ARIA progress attributes on visual bars ensures data transparency across all assistive technologies.
**Action:** Always implement `window.scrollTo({ top: 0, behavior: 'smooth' })` for global filter triggers. Use predictive `aria-label` and `title` attributes (e.g., "Mark as Finished") instead of just describing current state. Ensure all visual progress indicators have `role="progressbar"` and relevant `aria-valuenow` attributes.
