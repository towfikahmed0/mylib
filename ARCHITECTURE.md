# Architecture (Current State)

This document describes the checked-in application. The PRD is the source of product requirements, not proof of implementation. Status labels below reflect this repository only; deployed Firebase resources cannot be inferred unless configured or represented here.

## Stack and Runtime

**Implemented:** React 19, TypeScript, Vite, React Router 7, Tailwind CSS 3, Firebase JS SDK 12 (modular Auth and Firestore), TanStack Query 5, Zustand 5, Chart.js/react-chartjs-2, Lucide React, DOMPurify, html5-qrcode, PapaParse, and html-to-image are declared or used in the current app. The app is mounted in `src/main.tsx`; Vite uses the React plugin. TypeScript is configured in the root `tsconfig*.json` files.

**PRD difference:** The PRD names React 18+, React Router 6, Firebase 10+, and shadcn/ui/Radix. The package currently uses newer major versions for React, Router, and Firebase; shadcn/ui and Radix are not declared dependencies. Do not write code as though those packages or APIs are available.

Root scripts are `dev`, `build` (`tsc -b && vite build`), `lint`, and `preview`; no test script is declared. See [package.json](package.json), [vite.config.ts](vite.config.ts), and [tsconfig.json](tsconfig.json).

## Source Responsibilities

- `src/main.tsx`, `src/App.tsx`: providers, router, routes, and global toaster.
- `src/pages/`: route-level screens, including library, social discovery, profile, settings, insights, activity, and admin.
- `src/components/`: shared layouts, route guards, loaders, placeholders, and UI primitives.
- `src/features/`: domain-oriented components, hooks, services, stores, and utilities for AI, auth, collaboration, insights, library, notifications, profile, reports, sharing, shelves, and social features.
- `src/lib/`: Firebase initialization and general utilities.
- `src/store/`: global toast and theme stores.
- `src/types/`: shared application and Firestore data types.
- `public/`: static assets and manifest. `archive/` contains legacy Vanilla JS/CSS/HTML and is not the active Vite entry point.
- `docs/PRD.txt` is product intent; `docs/prompt.txt` is a task prompt. Neither proves a feature is implemented.

## Routing and Authentication

`BrowserRouter` wraps the app. `App.tsx` defines the landing route, shared `AppLayout` routes, nested protected routes, an admin-protected route, public username profiles at `/u/:username`, and a not-found route. `ProtectedRoute` waits for auth loading, redirects signed-out users to `/`, and checks the loaded profile's `role` for the admin route.

`AuthProvider` listens to Firebase `onAuthStateChanged`, signs in through Google popup, then loads or creates `users/{uid}`. On first profile creation it also writes `users/{uid}/private/data`, `usernameLookup/{username}`, and `userLookup/{email}`. Route checks improve navigation UX; Firestore rules remain the data authorization boundary. The admin page itself is currently a placeholder.

## State and Data Flow

- **Remote/server state (Implemented):** TanStack Query wraps Firestore reads and mutations. Feature hooks own query keys, fetching, mutation, and invalidation. Some realtime surfaces use Firestore `onSnapshot` directly (for example, Activity).
- **Persistent client preferences (Implemented):** Zustand persistence stores theme/accent and AI provider/model/language preferences in browser local storage. The selected AI provider's BYOK API key is stored separately in `sessionStorage`.
- **Transient UI state (Implemented):** React component state handles modal visibility, form drafts, selected tabs, and similar view state. Some page preferences also use local storage directly.
- **Firestore access (Implemented):** Client code imports the shared `db` and uses the modular SDK directly. There is no repository backend API layer mediating normal application reads/writes.

The primary book model is `books/{bookId}`. Per-user reading state is in `books/{bookId}/readingStatus/{uid}`. Hooks combine book and status data for library, finished-book, and wishlist views. Other domain hooks follow the same direct-client pattern. Firestore rules and indexes are in [firestore.rules](firestore.rules) and [firestore.indexes.json](firestore.indexes.json); consult [FIRESTORE_SECURITY.md](FIRESTORE_SECURITY.md) before changing data access.

## AI Flow

**Implemented:** AI hooks construct prompts and library context; `src/features/ai/services/aiService.ts` calls Gemini or Groq REST endpoints directly from the browser. The selected provider key is read from `sessionStorage`; responses are kept in a bounded in-memory cache. Settings UI explains that keys remain in the browser tab session and are not sent to MyLib servers.

**Planned / not present:** A server-side AI proxy, system-managed AI provider, or repository Cloud Function is not present. Do not assume client-held keys are protected from the browser user or browser extensions.

## Firebase and Hosting

`src/lib/firebase.ts` initializes Firebase App, Google Auth, and Firestore from `VITE_FIREBASE_*` environment variables. It does not initialize Firebase Storage, Functions, or Messaging. `firebase.json` configures Firestore rules/indexes and Hosting from `dist`, with an SPA rewrite to `/index.html`.

**Unknown / cannot verify from repo:** Additional resources may exist in a deployed Firebase project, but this repository does not establish that. There is no Functions source/deploy target, FCM setup, or service-worker registration visible here. A manifest is linked in `index.html`; that alone does not establish offline caching or install/update behavior.

## PRD Status Matrix

| PRD area | Current status | Repository evidence / boundary |
| --- | --- | --- |
| Account, Google auth, profiles, route protection | Implemented | Auth context, profile hooks, public `/u/:username` route, protected routes. Keyboard shortcuts and a global error boundary were not found. |
| Core library, reading status, shelves, scanning | Partially implemented | Add/edit/detail flows, scanner component, books/status hooks, and shelves exist. PRD's full metadata fallback, drafts, duplicate workflow, and every quick action are not verified as complete. |
| Search, filters, bulk operations, pagination | Partially implemented | Tag/genre URL filters exist; a library search field is present, but text-search behavior was not verified. The main `useBooks` query reads the user's book collection without pagination. Public library uses paged queries. Full PRD filters, bulk actions, and 500-book pagination are not established. |
| Reading tracking and borrowing | Partially implemented | Status, progress, rating, highlights, timer persistence, and book-request flows exist. Review rule gaps are documented in [FIRESTORE_SECURITY.md](FIRESTORE_SECURITY.md). |
| Collaboration and sharing | Partially implemented | Requests, partnerships, partner library access, transfer UI, and share-image code exist. Treat permissions as unsafe until the rules gaps are addressed. |
| Social platform | Partially implemented | Explore feeds, user search, review creation, follows, and report submission exist. Review-card like/comment/delete interactions are not wired in the inspected UI. |
| AI librarian and insights | Partially implemented | Chat, summary, metadata tools, charts, reading activity/heatmap, and AI settings exist. System AI/BYOK admin controls and every planned analysis are not established. |
| Activity and notifications | Partially implemented | Activity and in-app notification collections/flows exist. Activity coverage is incomplete; browser push/FCM is not present in the repository. |
| Import/export and preferences | Partially implemented | CSV/JSON import/export, theme preferences, profile/privacy settings, and AI settings exist. PRD currencies, density/default sort controls, and all legacy migration tools are not established. |
| PWA/offline support | Planned / not present | A manifest is linked; no service worker or registration/offline implementation was found. Deployed infrastructure is unknown. |
| Platform administration | Partially implemented | Admin route guard and admin-only Firestore rules exist; `AdminPage` renders a placeholder. User management, reports moderation UI, backups, plans, and feature controls are not implemented in this UI. |
| Cloud Functions / FCM / backend services | Unknown / cannot verify from repo | No Functions source, deployment target, Messaging initialization, or service-worker source is present. The deployed Firebase project is not inspectable here. |

## Architectural Notes

- Several planned feature boundaries exist as folders/hooks, but server-side operations are generally direct Firestore client writes; validate the rules alongside each flow.
- `AppUser` profile creation creates lookup documents in separate writes, not one atomic transaction. Partial initialization/recovery behavior is an area to consider when changing onboarding.
- Current route names and navigation are product-specific (`/mybooks`, `/u/:username`); retain these public paths unless a requested migration includes redirects and data-flow review.