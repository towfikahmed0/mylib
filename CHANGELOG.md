# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.0] - 2026-10-07

### Added
- **Admin Announcement & Banner System**:
  - Exclusively available to system administrators via the Admin Panel under Messaging > Banners.
  - Multi-target broadcasting: Broadcast to all users or target a specific individual user.
  - Markdown Composer: Full Markdown support with live side-by-side simulation preview.
  - 3 Severity Color Themes: Info (Sky/Blue), Warning (Amber/Yellow), and Danger (Rose/Red) with contextual badges and icons.
  - 3 Display Modes:
    1. Full Board Notice: Accessible modal upon opening the application.
    2. Library Top Banner: Prominent announcement bar at the top of the main Library catalog.
    3. Pop-up Toast: Accessible alert notification toast.
  - Strict Dismissal Persistence: Once a user closes an announcement, it is recorded in local storage and never displayed again to that user.
  - Admin Management Table: Live active/inactive status toggle, expiration controls, action buttons/links, and deletion with confirmation.
  - Cloud Firestore Security Rules: Secured `/systemBanners/{bannerId}` collection with public client read access and strict admin-only mutation and schema validation rules.

## [3.2.0] - 2026-10-07

### Added
- **Automatic Version Management**: Single source of truth in `package.json` exposed at runtime via `APP_VERSION` (`import.meta.env.VITE_APP_VERSION`), displayed across the application.
- **PWA Update Notification Toast**: Returning users automatically receive service-worker-activated updates with a small, accessible, non-intrusive toast in the bottom-right corner announcing `Version updated to v<X.Y.Z>`. Does not trigger on first visit and auto-dismisses after 6 seconds.
- **Firebase Cloud Messaging (FCM)**:
  - Custom soft pre-prompt modal after user login explaining notification benefits without unprompted browser permission popups.
  - Dedicated Push Notifications toggle card in account Settings allowing users to enable or disable push notifications anytime.
  - Foreground message listener handling in-app toast alerts.
  - Root service worker (`firebase-messaging-sw.js`) handling background notifications with deep-link navigation.
  - Direct Firebase Console broadcast support without requiring backend server databases or token tables.
- **Automated Production Deployment**: Safe GitHub Actions workflow (`.deploy.yml`) running `npm run lint` and `npm test` before building and deploying to production with GitHub Environments protection and live health check.
- **Developer Documentation**: Comprehensive `docs/DEV_DOCUMENTATION.md` detailing build, deploy, rollback, FCM, and PWA workflows.

### Fixed
- Fixed ESLint unused variable errors and empty catch blocks in `BookCard.tsx`, `CurrentlyReadingSection.tsx`, `ScannerModal.tsx`, `useBookReviews.ts`, `ReadingPlan.tsx`, and `LibraryPage.tsx`.
- Enabled `npm test` running Vitest in CI and local environments.

## [3.1.0] - 2026-10-05

### Added
- Personal library cataloging with ISBN and barcode scanning.
- AI Librarian integration (Gemini and Groq).
- Reader collaboration, lending, and borrowing workflow.
- Reading insights, statistics, charts, and reading plan roadmap.
- Multi-theme support (light, dark, sepia).
- Offline-first PWA caching and install prompt.
