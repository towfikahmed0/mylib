# Developer Documentation

Welcome to the **MyLib** developer guide. This document provides technical instructions for versioning, local development, building, deploying, monitoring, and maintaining the application.

---

## 1. Version History

| Version | Release Date | Summary of Changes |
| :--- | :--- | :--- |
| **v3.3.0** | 2026-10-07 | Admin Announcement & Banner System: targeted messaging (all vs specific user), Markdown composer with live preview, 3 severity colors (info, warning, danger), 3 display modes (app-open modal notice, top library banner, pop-up toast), client dismissal persistence in local storage, and Firestore security rules. |
| **v3.2.0** | 2026-10-07 | Single-source version management, PWA auto-update notification toast, Console-driven Firebase Cloud Messaging with soft pre-prompt and Settings toggle, safe CI/CD pipeline on `production`, and test/lint validation. |
| **v3.1.0** | 2026-10-05 | Full React 19 frontend migration, ISBN scanner, collaborative book lending, reading plan, AI Librarian, and offline service worker caching. |

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended).
- **Package Manager**: `npm` (v10+).
- **Firebase Project**: An active Firebase project with Authentication (Google sign-in) and Cloud Firestore enabled.

---

## 3. Local Development Commands

```bash
# Clone the repository
git clone https://github.com/towfikahmed0/mylib.git
cd mylib/mylib-react

# Install dependencies (exact lockfile)
npm ci

# Configure environment variables
cp .env.example .env.local
# Fill in your Firebase configuration keys in .env.local

# Start development server with Hot Module Replacement (HMR)
npm run dev

# Run automated tests
npm test

# Run ESLint validation
npm run lint

# Preview production build locally
npm run preview
```

---

## 4. Production Build Commands

```bash
# Build the production bundle and service workers
npm run build
```

The build command:
1. Injects `package.json` version into `import.meta.env.VITE_APP_VERSION`.
2. Bundles the React application via Vite and Rolldown.
3. Generates the Workbox precache service worker (`dist/sw.js`).
4. Generates web manifest and assets in the `dist/` directory.

---

## 5. Branch Strategy

The repository follows a three-tier branch lifecycle:

```text
[feature/fix branches] ──► [main] (development)
                             │
                             ▼
                         [staging] (pre-production verification)
                             │
                             ▼
                        [production] (auto-deploys to live)
```

- `main`: Active development branch. All feature branches merge here via pull requests.
- `staging`: Pre-production staging environment for integration and QA tests.
- `production`: Production release branch. Merging or pushing to `production` automatically triggers `.github/workflows/deploy.yml`.

> [!IMPORTANT]
> Do not push untested code directly to `production`. Code should always graduate from `main` to `staging` to `production`.

---

## 6. Automated & Manual Deployment

### Automated Deployment (GitHub Actions)
Deployments are handled by `.github/workflows/deploy.yml`:
1. **Trigger**: Push/merge to the `production` branch or manual `workflow_dispatch`.
2. **Quality Gates (Safety)**:
   - `npm ci`
   - `npm run lint` (ESLint checks with 0 max-warnings)
   - `npm test` (Vitest test suite)
   - If any lint or test fails, the deployment halts immediately.
3. **Build & Package**:
   - `npm run build` with Firebase environment variables injected from GitHub Secrets.
   - Copies `.htaccess` into `dist/`.
4. **Deploy**:
   - Transfers files using FTP to the production server directory (`/home/spcschoolc/mylib`).
5. **Health Check**:
   - Issues an HTTP request to `https://mylib.softrly.com` and verifies a healthy 2xx/3xx response code.

### Manual Deployment via Shell Script
For manual deployments or offline maintenance:
```bash
./deploy.sh
```
This builds the app, verifies `.htaccess` inclusion, and produces `dist.zip` ready for upload into cPanel File Manager.

---

## 7. Required GitHub Secrets & Environments

Configure a GitHub Environment named `production` with the following secrets:

| Secret Name | Description | Example / Note |
| :--- | :--- | :--- |
| `FTP_SERVER` | Production FTP hostname | `ftp.example.com` or server IP |
| `FTP_USERNAME` | Production FTP username | cPanel FTP user |
| `FTP_PASSWORD` | Production FTP account password | Secure credential |
| `FTP_SERVER_DIR` | Destination root directory | `/home/spcschoolc/mylib` or `/public_html` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-firebase-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `your-firebase-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456789012:web:...` |
| `VITE_FIREBASE_VAPID_KEY` | FCM Web Push Certificate Key Pair | Web push VAPID public key |

---

## 8. Environment Variables

Store these variables in `.env.local` for local development:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_web_push_vapid_key
```

---

## 9. Firebase Cloud Messaging (FCM) Setup

MyLib uses **Console-driven** push notifications. There is no custom backend server, database token table, or token storage API.

### Web Push Certificate (VAPID Key)
1. Open the [Firebase Console](https://console.firebase.google.com).
2. Go to **Project Settings** > **Cloud Messaging** tab.
3. Under **Web configuration**, find **Web Push certificates**.
4. If no key pair exists, click **Generate key pair**.
5. Copy the public key into `VITE_FIREBASE_VAPID_KEY` in `.env.local` and your GitHub Secrets.

### Client Implementation Architecture
- `public/firebase-messaging-sw.js`: Root-level service worker that handles background messages when the user is not actively on the tab.
- `src/lib/push/pushRegistration.ts`: Client-side registration that requests permission and obtains the FCM token without saving it to any backend or Firestore collection.
- `src/features/notifications/components/NotificationPromptModal.tsx`: Soft pre-prompt modal displayed once after login to explain the benefits before triggering native browser prompts.
- `src/features/notifications/components/ForegroundFcmHandler.tsx`: Handles foreground message reception using `onMessage` and displays an accessible in-app toast.
- `src/features/notifications/components/NotificationSettingsCard.tsx`: Toggle card in **Settings** allowing users to grant or disable notifications at any time.

### Sending Messages from Firebase Console
1. Navigate to **Firebase Console** > **Messaging** (or **Run campaigns** > **Messaging**).
2. Click **New campaign** > **Firebase Notification messages**.
3. Enter Notification Title and Notification Text.
4. Set Target: Select your Web App.
5. In **Additional options** (optional):
   - Add Custom Data: `link` or `url` with path (e.g. `/library`, `/shelves`).
   - When the user clicks the notification, `firebase-messaging-sw.js` reads this link and focuses/navigates to that page.
6. Click **Review** and **Publish**.

---

## 10. PWA Update Flow

The application implements an automatic background update and notification contract:

```text
[1. User opens App]
       │
       ▼
[2. Service Worker checks server] ──► Newer build detected
       │
       ▼
[3. Service Worker installs & activates (skipWaiting & clientsClaim)]
       │
       ▼
[4. Controller change detected] ──► Page automatically reloads once
       │
       ▼
[5. App compares current version against localStorage('mylib_app_version')]
       │
       ├─► Differs AND previous version stored:
       │     └─► Display accessible bottom-right toast: "Version updated to v<X.Y.Z>"
       │     └─► Update localStorage with new version
       │     └─► Auto-dismiss after 6s (or user dismisses)
       │
       └─► First visit (no previous version stored):
             └─► Store current version silently without toast
```

---

## 11. Rollback Procedure

If a deployed version in production experiences unexpected critical failures:

1. **Locate Last Known Good Commit**:
   ```bash
   git checkout production
   git log --oneline -n 10
   ```
2. **Revert or Deploy Known Good Release**:
   - **Option A (GitHub Revert)**: Create a revert commit on `production`:
     ```bash
     git revert HEAD --no-edit
     git push origin production
     ```
     The deployment workflow will run tests, build the previous version, and deploy automatically.
   - **Option B (Manual cPanel Rollback)**: If immediate emergency rollback is needed without waiting for CI:
     1. Unpack the previous `dist.zip` backup directly on the server.
     2. Purge Cloudflare or edge CDN caches if applicable.
3. **Verify Service Worker & Clients**:
   - Clients running the faulty version will detect the reverted service worker on their next visit, reload once, and display the updated version toast reverting to the stable release.

---

## 12. Admin Announcement & Banner System

MyLib includes an announcement delivery system allowing administrators to broadcast messages across the application without code deploys.

### Capabilities & Options
- **Target Audience**: Broadcast to all users (`target: 'all'`) or target an individual user (`target: 'specific'`).
- **Markdown Support**: Messages support full GitHub-flavored Markdown (headers, bold, lists, links, code) rendered via `MarkdownRenderer`.
- **Severity & Color Schemes**:
  - `info`: Blue / Sky theme for informational updates.
  - `warning`: Amber / Yellow theme for scheduled maintenance and cautions.
  - `danger`: Red / Rose theme for critical alerts or outages.
- **Display Modes**:
  1. `modal`: Full-board notice presented immediately when any user opens the application (rendered via `GlobalBannerContainer` in `App.tsx`).
  2. `banner`: Prominent banner anchored to the top of the main Library catalog (`LibraryBanner` in `LibraryPage.tsx`).
  3. `toast`: Pop-up alert toast anchored in the viewport.
- **Dismissal Persistence Contract**:
  - Users can close or dismiss any announcement using the close button.
  - Once dismissed, the banner ID is saved in client storage (`localStorage['mylib_dismissed_banners']`).
  - Dismissed banners are never presented again to that user on that device.
- **Expiration & Status Controls**:
  - Optional `expiresAt` timestamp automatically suppresses outdated announcements.
  - Active state toggle allows administrators to show or hide banners on demand.
  - Optional call-to-action button with custom label and target URL.

### Firestore Security & Data Model
- **Collection**: `/systemBanners/{bannerId}`
- **Security Rules**:
  - `allow read: if true;` allows all client sessions to query active announcements.
  - `allow create, update: if isAdmin() && isValidBanner();` enforces administrative rights, schema conformance, enum validation, and string length bounds (title <= 200, message <= 5,000).
  - `allow delete: if isAdmin();` permits administrative removal.

