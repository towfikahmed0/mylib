# 📚 MyLib — Personal Library Manager

> **Your books, your reading life, your library — all in one place.**

**MyLib** is a modern, cloud-connected library management application built with React and Firebase.

It helps users catalog the books they own, discover and add books using ISBN/barcode scanning, track reading progress, manage personal collections, upload book covers, organize books with powerful search and filters, and collaborate with other readers.

MyLib is designed around a simple idea:

> **A library is more than a database of books. It's a record of what you own, what you read, and what matters to you.**

---

## ✨ What MyLib Does

MyLib combines personal library management with reading and collaboration features.

### 📚 Library Management

* Add and manage books
* ISBN/barcode-based book lookup
* Automatic book metadata retrieval
* Manual book entry
* Upload custom book covers
* Track ownership and personal copies
* Reading status and progress
* Ratings, notes, and highlights
* Favorites and wishlist
* Tags and genres
* Advanced search, filtering, and sorting
* Bulk library operations

### 🌐 Community & Collaboration

* User accounts
* Reader profiles
* Reviews
* Likes and comments
* Activity feed
* Shared libraries
* Collaboration requests
* Permission-aware library access
* Book ownership transfers
* Collaboration activity

### 📊 Insights

* Reading statistics
* Collection statistics
* Genre distribution
* Author statistics
* Rating distribution
* Collection value
* Reading progress
* Reading goals
* Collaborator statistics

### 📱 Modern Web Experience

* Responsive React interface
* Progressive Web App support
* Mobile-friendly design
* Dark, light, and reading-friendly themes
* Offline-capable Firestore data
* Real-time synchronization
* Keyboard accessibility
* Responsive layouts

---

# 🏗️ Application Architecture

The new MyLib application uses a **React + Firebase** architecture.

```text
┌───────────────────────────────────────┐
│               MyLib UI                │
│              React App               │
└───────────────────┬───────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
     Firebase Auth       Application APIs
          │                   │
          ▼                   ▼
     User Identity      Book Metadata APIs
                              │
                              ▼
                 Google Books / Open Library

                    │
                    ▼
             Cloud Firestore
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
      Book Catalog         User Data
     Global book data   Personal ownership,
                        reading & activity
```

The architecture separates **book information that belongs to the book itself** from **information that belongs to a particular user's copy or relationship with that book**.

This prevents the same book from being unnecessarily duplicated when multiple users add it to their libraries.

---

# 📖 Book Data Architecture

One of the key architectural improvements in the new version is the separation between the global book catalog and user-specific library records.

## `bookCatalog`

Contains information about the actual book.

Typical information includes:

* Title
* Authors
* ISBN
* Publisher
* Publication date
* Description
* Categories
* External metadata
* Cover information
* Search/identification metadata

A single catalog entry can be referenced by many users.

```text
bookCatalog
    │
    ├── Book A
    ├── Book B
    └── Book C
```

## User Book Records

User-specific records describe a user's relationship with a catalog book.

These records can contain information such as:

* Ownership
* Reading status
* Reading progress
* Rating
* Personal notes
* Highlights
* Tags
* Favorite status
* Wishlist status
* Purchase information
* Personal copy information
* User-specific cover information when applicable

Conceptually:

```text
              bookCatalog
                   │
             ┌─────┼─────┐
             │     │     │
           User A User B User C
             │     │     │
          UserBook UserBook UserBook
```

This means that if three users add the same edition of a book, MyLib does **not** need to create three independent copies of the global book metadata.

---

# 📷 Adding Books

MyLib supports several ways to add books.

## ISBN / Barcode Scanning

Users can scan a book's barcode using a supported device camera.

The application can use the ISBN obtained from the scan to search for existing catalog information or retrieve metadata from external book databases.

## Automatic Metadata

MyLib can use external services such as:

* Google Books API
* Open Library API

These services can provide information including:

* Title
* Author
* ISBN
* Publisher
* Publication information
* Categories
* Description
* Cover artwork

## Existing Catalog Detection

Before creating a new catalog record, MyLib can check whether the book already exists.

This helps avoid duplicate catalog entries.

## Manual Entry

If a book cannot be identified automatically, users can enter its information manually.

---

# 🖼️ Book Cover Uploads

The new MyLib architecture supports user-uploaded book covers rather than relying exclusively on external image URLs.

The application can therefore support:

* Automatically retrieved covers
* User-uploaded covers
* Custom covers for editions that are missing from external databases

Book cover files are handled separately from Firestore's structured document data.

Firestore remains responsible for metadata and relationships, while uploaded image files are stored through the application's file-storage/hosting layer.

This keeps Firestore documents lightweight and avoids treating Firestore as a file-storage system.

---

# 🔍 Search & Organization

MyLib is designed to remain useful as a collection grows.

## Search

Users can search their collection using relevant book information such as:

* Title
* Author
* ISBN
* Genre
* Tags
* Other indexed metadata

## Filters

Library filtering can include:

* Reading status
* Genre
* Author
* Rating
* Price
* Purchase date
* Favorites
* Wishlist
* Tags
* Copy/ownership type

## Sorting

Users can organize their library according to different sorting preferences.

---

# 📖 Reading Management

MyLib allows users to track their reading journey.

Books can have statuses such as:

* 📚 Want to Read
* 📖 Reading
* ✅ Finished

Users can also maintain:

* Reading progress
* Ratings
* Personal notes
* Highlights
* Favorites
* Reading goals

---

# 📝 Notes & Highlights

Users can save personal information associated with books.

Highlights can optionally include a page reference and can be:

* Added
* Viewed
* Updated
* Removed

This allows MyLib to function as a personal archive of ideas discovered while reading.

---

# ⭐ Reviews

Users can write reviews for books.

Reviews can include:

* Star ratings
* Written content
* Review categories
* Reading-time information
* Likes
* Comments

Reviews are designed around a text-focused reading experience.

---

# 🌐 Community

MyLib includes social features for readers.

## Reader Profiles

Users can have profiles containing information such as:

* Display name
* Join date
* Library statistics
* Reading statistics
* Reviews

## Activity Feed

The activity system can display relevant events such as:

* Books being added
* Reading-status changes
* Ownership transfers
* Collaboration activity
* Messages
* Other library events

## Likes & Comments

Users can interact with community reviews through likes and comments.

---

# 🤝 Shared Libraries

MyLib supports collaboration between users.

A user can establish a collaboration with another MyLib user and share appropriate library access.

Depending on permissions, collaborators can:

* View books
* Add books
* Access shared library information
* Participate in collaborative activity
* Transfer book ownership
* Receive notifications

### Permission-Aware Access

Sharing a library does not automatically mean giving another user unrestricted editing access.

MyLib distinguishes between:

* Library membership
* Viewing access
* Editing permissions
* Ownership

These permissions are enforced through Firestore security rules.

---

# 🔄 Book Ownership Transfers

Books can be transferred between users who have an appropriate collaboration relationship.

The system can support:

* Individual transfers
* Bulk transfers
* Transfer notifications
* Ownership updates
* Activity records

Bulk operations use Firestore-safe batched operations where appropriate.

---

# 🔔 Notifications & Activity

MyLib provides activity and notification features for important events.

Examples include:

* Collaboration requests
* Book transfers
* Shared-library activity
* Reading activity
* Messages
* Other user-specific events

Notifications are associated with their intended recipient and relevant application action.

---

# 📊 Library Insights

MyLib turns library data into useful statistics.

Insights can include:

### 📚 Collection Statistics

* Total books
* Ownership statistics
* Collection composition

### 📖 Reading Statistics

* Want to Read
* Currently Reading
* Finished books
* Reading progress
* Reading goals

### ⭐ Ratings

* Rating distribution
* Average rating

### 🏷️ Organization

* Genre distribution
* Author statistics
* Tag statistics

### 💰 Collection Value

* Total recorded value
* Average book price

### 🤝 Collaboration

* Shared-library statistics
* Collaborator reading activity

---

# 🤖 AI Librarian

MyLib can provide an AI-powered librarian experience for interacting with the user's collection.

The AI experience can support natural-language interactions such as:

* Finding books using natural language
* Asking questions about a collection
* Receiving reading-oriented recommendations
* Exploring reading history
* Analyzing library information

The AI layer is designed to work with relevant collection context rather than treating the assistant as a completely separate feature.

---

# 🔐 Authentication & Security

MyLib uses **Firebase Authentication** for user identity and **Cloud Firestore Security Rules** for database authorization.

The security model is designed around ownership and relationships.

Access can depend on whether a user is:

* The authenticated account owner
* A book owner
* A collaborator
* A review author
* A participant in an interaction
* A member of a shared library

Firestore rules are responsible for enforcing authorization at the database level.

> **Important:** Firebase client configuration is not a security boundary. Authorization must be enforced through Firebase Security Rules and appropriate backend/storage controls.

---

# ☁️ Firebase

MyLib uses Firebase for core cloud functionality.

### Firebase services

* Firebase Authentication
* Cloud Firestore
* Firestore Security Rules
* Firestore real-time listeners
* Firestore offline persistence

Firebase provides the application's primary cloud database and synchronization layer.

---

# 📴 Offline Support

MyLib can use Firestore's offline persistence to keep previously available application data usable during temporary connectivity problems.

When connectivity is restored, Firestore can synchronize pending changes according to its offline synchronization behavior.

The application is also designed as a Progressive Web App.

---

# 📱 Progressive Web App

MyLib is designed to work as an installable web application.

On supported browsers and devices, users can install MyLib and launch it similarly to an application.

The PWA configuration provides:

* Application name
* App icon
* Standalone display mode
* Theme configuration
* Start URL
* Service Worker support

---

# ♿ Accessibility & UX

The React interface aims to provide a usable experience across desktop and mobile devices.

The application includes support for features such as:

* Responsive layouts
* Keyboard navigation
* Visible focus states
* Modal keyboard controls
* Escape-to-close interactions
* Reduced-motion preferences
* Accessible status messaging
* Mobile-friendly controls

---

# 🎨 Personalization

MyLib supports interface personalization.

Depending on the current application configuration, users can choose between visual modes such as:

* ☀️ Light
* 🌙 Dark
* 📜 Sepia

Library layouts can also provide different viewing styles, such as:

* Grid
* List
* Compact

---

# 📥 Import & Export

MyLib can support structured collection data import/export workflows.

Supported formats may include:

* CSV
* JSON

CSV processing can be handled using **PapaParse**.

Import/export functionality should be treated as a data-management feature and should preserve the distinction between global catalog information and user-specific library information.

---

# 🛠️ Technology Stack

| Technology                     | Purpose                              |
| ------------------------------ | ------------------------------------ |
| React                          | Frontend application                 |
| JavaScript / JSX               | Application logic                    |
| CSS / Tailwind CSS             | Interface styling                    |
| Firebase Authentication        | User authentication                  |
| Cloud Firestore                | Database & real-time synchronization |
| Firestore Security Rules       | Authorization                        |
| Service Worker                 | PWA functionality                    |
| Google Books API               | Book metadata                        |
| Open Library API               | Book metadata                        |
| html5-qrcode / barcode scanner | ISBN/barcode scanning                |
| PapaParse                      | CSV processing                       |
| Chart.js                       | Data visualization                   |

---

# 🗂️ Project Structure

The React version uses a component-based frontend architecture.

A typical structure is:

```text
mylib/
├── public/
│   ├── icons/
│   ├── manifest.*
│   └── ...
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── context/
│   ├── assets/
│   ├── firebase/
│   └── ...
│
├── firestore.rules
├── package.json
├── package-lock.json
├── vite.config.*
└── README.md
```

> The exact directory structure may change as the application evolves. The source code should be treated as the authoritative representation of the current implementation.

---

# 🚀 Getting Started

## Requirements

Before running MyLib locally, install:

* Node.js
* npm
* A Firebase project

## Install

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd mylib
npm install
```

## Development

Start the local development server:

```bash
npm run dev
```

The application will normally become available through the local development URL displayed by Vite.

## Production Build

Create the production build with:

```bash
npm run build
```

The generated production files are placed in the project's build output directory, typically:

```text
dist/
```

For static hosting, the contents of the build output directory are what should be deployed.

> `node_modules/` should not be uploaded to the production web server.

---

# 🔥 Firebase Configuration

A Firebase project is required for the application's cloud features.

Configure:

1. Firebase Authentication
2. Google Sign-In
3. Cloud Firestore
4. Firestore indexes where required
5. Firestore Security Rules
6. Application Firebase configuration
7. Required storage/file-serving configuration for uploaded covers

The exact configuration depends on the deployment environment.

---

# 🌍 Deployment

MyLib is a client-side React application and can be deployed to static hosting.

A production deployment generally consists of:

```text
React source
     │
     ▼
npm run build
     │
     ▼
dist/
     │
     ▼
Static Web Hosting
```

For a cPanel-based deployment, upload the generated production files from `dist/` to the appropriate document root of the domain or subdomain.

The production site should be served over **HTTPS**, particularly because camera-based barcode scanning and PWA functionality depend on browser security requirements.

---

# 🧪 Development Principles

MyLib should prioritize:

* Data integrity
* Secure authorization
* Reusable React components
* Clear separation of concerns
* Minimal unnecessary Firestore reads/writes
* Efficient real-time listeners
* Responsive UI
* Accessibility
* Reliable offline behavior
* Safe batch operations
* Scalable book/catalog relationships

When adding new functionality, existing library, collaboration, security, and synchronization behavior should be preserved.

---

# 📌 Current Architecture

**Frontend:** React
**Build tool:** Vite
**Database:** Cloud Firestore
**Authentication:** Firebase Authentication
**Book metadata:** Google Books / Open Library
**Storage:** External file-storage/hosting layer for uploaded covers
**Deployment:** Static hosting / cPanel-compatible hosting
**Application type:** Progressive Web App

---

# 🗺️ Project Vision

MyLib is evolving from a simple personal book catalog into a complete digital library environment.

The goal is to bring together:

**Discover → Catalog → Own → Read → Track → Remember → Share**

A book can be something you own, something you're reading, something you want to read, something you want to remember, or something you want to discuss with another reader.

MyLib brings these relationships together in one application.

---

# ❤️ Credits

Created with ❤️ by **Towfik Ahmed**

GitHub:
https://github.com/towfikahmed0

---

> **Every library has a story. MyLib helps you keep yours.**
