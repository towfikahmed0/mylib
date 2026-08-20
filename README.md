# 📚 MyLib v3.1

> **Your personal library, reading life, and literary community — in one place.**

**MyLib** is a modern, privacy-conscious book library manager and reading platform built for people who want more than a simple list of books.

Catalog your physical and digital collection, discover books through barcode scanning, track your reading journey, write thoughtful reviews, collaborate with other readers, explore your reading statistics, and use an AI-powered librarian to interact with your collection.

MyLib is designed around one idea:

> **Your books are more than inventory. They are part of your story.**

---

## ✨ Why MyLib?

Most book apps focus on only one thing.

Some help you track what you read.  
Some help you discover books.  
Some provide social reviews.  
Some manage collections.

**MyLib brings these experiences together.**

It gives you:

- 📚 A personal digital catalog
- 🔎 Powerful search and filtering
- 📷 QR/barcode scanning
- ☁️ Real-time cloud synchronization
- 📴 Offline-first functionality
- ⭐ Reading progress and ratings
- ❤️ Favorites and wishlists
- 📝 Personal reviews, notes, and highlights
- 🌐 A social reading feed
- 💬 Likes and comments
- 🤝 Shared libraries and collaboration
- 🔄 Book ownership transfers
- 📊 Reading and collection analytics
- 🤖 An AI Librarian
- 📱 Installable Progressive Web App experience
- 🌙 Multiple visual themes
- ⌨️ Keyboard shortcuts and accessibility features

---

# 🌟 Features

## 📚 Personal Library

Build your own searchable catalog of books.

Each book can contain information such as:

- Title
- Author
- ISBN
- Genre/category
- Multiple genres
- Tags
- Cover image
- Price
- Purchase date
- Reading status
- Rating
- Reading progress
- Personal comments
- Favorites
- Wishlist status
- Highlights
- Additional metadata

Your library is synchronized with your account through Firebase, allowing the same collection to follow you across devices.

---

## 📷 Add Books in Seconds

Adding a book doesn't have to mean typing everything manually.

### Barcode & QR Scanner

Use your device's camera to scan a book's barcode or QR code.

MyLib can then attempt to identify the book and retrieve metadata automatically.

### Automatic Metadata

MyLib integrates with:

- **Google Books API**
- **Open Library API**

When information is available, MyLib can retrieve details such as:

- Title
- Author
- ISBN
- Categories
- Cover artwork
- Subject information

If automatic lookup doesn't find the book, you can fall back to manual entry.

### Manual Entry

Have an unusual edition or a book that isn't in the external databases?

No problem.

You can enter the book yourself.

---

# 📥 Import & Export

Already have a large collection?

You don't need to enter hundreds of books one by one.

MyLib supports collection import workflows using structured files such as:

- CSV
- JSON

This makes it easier to migrate an existing collection into MyLib.

CSV processing is powered by **PapaParse**.

---

# 🔎 Search & Organization

A large library should become easier to navigate as it grows—not harder.

MyLib provides fast search and multiple ways to organize your collection.

### Search

Search your collection using information such as:

- Book title
- Author
- Genre
- Tags
- Other indexed metadata

### Sorting

Choose how your collection is ordered, with preferences saved locally.

### Filters

Combine filters to narrow your library down to exactly what you're looking for.

Available filtering capabilities include:

- Reading status
- Genre
- Author
- Rating
- Price range
- Purchase date range
- Favorites
- Tags
- Copy type

### Advanced Search

Advanced filtering lets you answer questions such as:

> "Show me my favorite books in this genre."

or:

> "Which books did I buy within a particular price range?"

or:

> "Which books have I not finished yet?"

---

# ❤️ Favorites & Wishlist

Mark books as **favorites** so they are easy to find again.

You can also maintain a **wishlist** for books you want to read or acquire.

This creates a useful separation between:

- What you own
- What you're currently reading
- What you've finished
- What you want to read
- What you especially love

---

# 📖 Reading Tracking

MyLib isn't only an inventory manager.

It can also track your reading journey.

Books can have reading states such as:

- 📚 Want to Read
- 📖 Reading
- ✅ Finished

You can also store:

- Ratings
- Reading progress
- Personal comments
- Highlights

This turns your library into a record of your reading history.

---

# ✍️ Notes & Highlights

Found a sentence worth remembering?

Save it.

MyLib supports personal highlights associated with books, optionally including a page reference.

Highlights can be:

- Added
- Viewed with the book
- Removed when no longer needed

Your library therefore becomes more than a catalog—it can become a personal archive of ideas you've encountered while reading.

---

# 📝 Reviews

Books can become part of the wider MyLib community through reviews.

Reviews are designed around a **text-first reading experience**, with an emphasis on thoughtful writing rather than visual noise.

Reviews support:

- Star ratings
- Written content
- Reading-time estimates
- Categories
- Likes
- Comments

MyLib's Firestore rules currently support review categories including **Help**, **Review**, and **Others**.

---

# 🌐 Explore the Reading Community

MyLib includes a social reading layer.

Discover what other readers are writing and thinking about.

The community experience includes:

### ❤️ Likes

Like reviews with an optimistic interface and animated feedback.

### 💬 Comments

Open a review's comment thread and participate in the discussion.

### 👤 Reader Profiles

Visit another reader's profile to see information such as:

- Display name
- Join date
- Collection statistics
- Finished-book statistics
- Their reviews

### 📰 Activity Feed

The activity system can surface events from your own and shared libraries, including book additions, status changes, transfers, and reader messages.

---

# 🤝 Shared Libraries & Collaboration

One of MyLib's most distinctive features is its collaboration system.

You can connect your library with another reader through a collaboration request.

Once a partnership is established, MyLib can synchronize access to shared libraries in real time.

Depending on the collaboration permissions, partners can:

- View shared books
- Add books
- Browse another library
- Track collaborative activity
- Transfer book ownership
- Receive activity notifications
- Compare reading activity

This makes MyLib useful not only for individuals, but also for:

- Couples
- Families
- Friends
- Reading partners
- Small personal collections shared between people

### 🔐 Permission-aware collaboration

Collaboration isn't simply an unrestricted database share.

MyLib distinguishes between library membership and editing permission.

For example, a collaborator may be allowed to view a library without automatically receiving permission to add books.

These permissions are enforced through Firestore security rules.

---

# 🔄 Transfer Book Ownership

Books can be transferred between active collaborators.

You can:

- Select individual books
- Select multiple books
- Transfer ownership to a collaborator
- Generate activity notifications for the recipient

Bulk transfers are implemented using Firestore batches to remain within Firestore's operation limits.

This is particularly useful when reorganizing a shared collection or giving books to another member of your reading circle.

---

# 🔔 Activity & Notifications

The Activity area gives your shared reading environment a sense of life.

It can record events such as:

- Books being added
- Books being transferred
- Reading-related activity
- Messages from collaborators
- Shared-library events

You can also post messages directly to the activity feed.

---

# 🤖 AI Librarian

MyLib includes an **AI Librarian** designed to interact with your collection in a more natural way.

Instead of manually constructing complicated filters, the AI experience can be used for things such as:

- Collection-aware recommendations
- Natural-language library searches
- Reading-oriented questions
- Analysis of your collection
- Discovering books based on your existing reading history

The application maintains AI conversation history and caches recent responses to improve the experience.

Think of it as asking a librarian who already knows what's on your shelves.

---

# 📊 Library Insights

Your collection contains data.

MyLib turns that data into useful insights.

The Insights area can analyze:

### 📈 Reading Progress

Understand how much of your collection you've completed.

### ⭐ Rating Distribution

See how your ratings are distributed across your books.

### 📚 Genre Composition

Discover which genres dominate your collection.

### ✍️ Authors

Analyze which authors appear most frequently.

### 🏷️ Tags

Understand how you've categorized your collection.

### 💰 Collection Value

Track the total recorded value of your library and calculate average book prices.

### 📖 Reading Velocity

Estimate your reading pace based on finished books and collection activity.

### 🎯 Reading Goals

Set a personal reading goal and see your progress toward it.

### 🤝 Collaborator Statistics

When libraries are shared, MyLib can display reading activity and completion statistics for collaborators.

Charts are rendered with **Chart.js**.

---

# 🎨 Personalization

MyLib is designed to feel like your own reading space.

### 🌞 Light Mode

A clean, bright interface for everyday use.

### 🌙 Dark Mode

A darker interface designed for comfortable low-light use.

### 📜 Sepia Mode

A warm, book-like visual theme inspired by traditional reading environments.

### 📐 View Modes

Switch between different library layouts:

- Grid
- Compact
- List

### 📏 Card Density

Adjust the visual density of library cards according to your preference.

### 💱 Currency

Collection prices can be displayed using supported currencies, including:

- USD
- EUR
- GBP
- BDT
- INR
- JPY

---

# ⌨️ Keyboard Shortcuts

MyLib also supports keyboard-oriented navigation.

Some useful shortcuts include:

| Key | Action |
|---|---|
| `/` | Focus library search |
| `N` | Add a new book |
| `L` | Open Library |
| `M` | Open My Books |
| `A` | Open Activity |
| `I` | Open Insights |
| `S` | Open Settings |
| `?` | Show keyboard shortcut help |
| `Esc` | Close the active modal |

Interactive cards can also be activated with **Enter** or **Space** when focused.

---

# ♿ Accessibility & UX

MyLib includes several small details intended to make the interface easier to use.

These include:

- Keyboard navigation
- Focus-visible states
- Modal focus trapping
- Escape-to-close modals
- Screen-reader-friendly status messaging
- Reduced-motion support
- Keyboard activation for interactive cards
- Responsive layouts
- Mobile-friendly controls

The application also includes global error handling intended to recover gracefully from unexpected client-side failures.

---

# 📱 Progressive Web App

MyLib is a **Progressive Web App (PWA)**.

That means it isn't limited to behaving like a conventional website.

On supported devices, MyLib can be installed and launched like an application.

The PWA manifest defines:

- Application name
- Short name
- Standalone display mode
- Theme color
- Application icon
- Start URL

---

# 📴 Offline-First Experience

One of MyLib's most important technical features is offline support.

The application enables Firestore offline persistence and uses a Service Worker to cache application resources.

This allows the application to remain useful even when connectivity is temporarily unavailable.

Changes can be synchronized once the connection is restored.

The Service Worker also detects application updates and can prompt the user to refresh when a new version is available.

---

# ☁️ Real-Time Synchronization

MyLib uses **Firebase Firestore** listeners to keep library data synchronized.

Instead of repeatedly refreshing the entire application, the application listens for incremental changes.

This is used for things such as:

- Books
- Reading statuses
- Activities
- Book requests
- Collaboration data

The v3.1 implementation also uses incremental document-change processing and local caches in several places to reduce unnecessary rendering and data processing.

---

# 🔐 Security

MyLib uses Firebase Authentication and Firestore security rules.

Authentication is currently provided through Google Sign-In.

Firestore rules distinguish access between:

- Users
- Library owners
- Collaborators
- Reading-status owners
- Review authors
- Review participants
- Activity-feed members
- Book-request participants
- Collaboration-request participants

For example, collaborators can only gain editing access to a library when the relevant collaboration permission allows adding books.

Reviews, comments, and likes also have ownership-aware rules.

The security model is implemented in `firestore.rules`.

> **Important:** Firebase client configuration values are not a replacement for Firestore security rules. Access control must always be enforced server-side through Firebase security rules.

---

# 🧠 Performance

MyLib v3.1 contains several performance-oriented improvements.

### Incremental Firestore updates

The application uses `docChanges()` in several real-time listeners instead of rebuilding all local state unnecessarily.

### Cached metadata

Author and genre metadata is cached for faster filtering and rendering.

### Cached currency information

Currency symbols are cached to avoid repeated storage lookups during rendering.

### Debounced search

Library search rendering is debounced to avoid unnecessary UI updates while typing.

### Batched operations

Large operations such as bulk deletion and ownership transfers are divided into Firestore-safe batches.

### Chart lifecycle management

Existing Chart.js instances are destroyed before replacement to avoid overlapping charts and memory-related UI problems.

---

# 🛠️ Technology Stack

MyLib is intentionally lightweight and primarily built with web technologies.

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| JavaScript | Application logic |
| Tailwind CSS | UI styling |
| Firebase Authentication | User authentication |
| Firebase Firestore | Cloud database & real-time sync |
| Firestore Security Rules | Authorization |
| Service Worker | Offline caching & PWA behavior |
| Chart.js | Analytics visualization |
| html5-qrcode | QR/barcode scanning |
| PapaParse | CSV processing |
| Google Books API | Book metadata |
| Open Library API | Book metadata |
| Canvas Confetti | Celebration effects |
| Heroicons / external icon assets | Interface icons |
| Google Fonts | Typography |

The main application is intentionally contained in a relatively simple web architecture, making the project easy to inspect and deploy.

---

# 🗂️ Project Structure

```text
mylib/
├── .Jules/
├── img/
│   └── ...
├── .gitignore
├── README.md
├── firestore.rules
├── index.html
├── learn.html
├── manifest.json
└── sw.js
```

### `index.html`

The primary MyLib application.

It contains the main UI, application state, Firebase integration, library management, social features, analytics, scanning, collaboration, and settings.

### `learn.html`

The built-in MyLib user guide.

It explains how to:

- Add books
- Organize collections
- Use collaboration
- Work with the offline experience

It also contains a small FAQ section.

### `firestore.rules`

Firebase Firestore authorization rules.

This is where access control for users, books, collaborations, reading statuses, reviews, comments, likes, requests, and activity feeds is enforced.

### `manifest.json`

Defines MyLib as an installable Progressive Web App.

### `sw.js`

Service Worker responsible for caching and offline-related behavior.

### `img/`

Application imagery and visual assets.

---

# 🚀 Getting Started

## For Users

The easiest way to use MyLib is through the deployed application.

**Web app:**  
https://mylib-web.vercel.app/

### 1. Open MyLib

Launch the application in a modern browser.

### 2. Sign in

Choose **Continue with Google**.

### 3. Add your first book

Use one of the available methods:

- Scan a barcode/QR code
- Enter book information manually
- Import a collection

### 4. Organize your collection

Add genres, tags, ratings, prices, purchase dates, and reading statuses.

### 5. Start reading

Track progress, save highlights, mark favorites, and write notes.

### 6. Explore Insights

Once your collection contains enough information, use Insights to understand your reading habits and collection.

### 7. Invite collaborators

Open Settings and connect with another MyLib user using their email address.

### 8. Explore the community

Write reviews, discover other readers, like posts, and participate in discussions.

---

# 👨‍💻 Development

MyLib is a client-heavy web application and does not require a traditional Node.js application server for the core frontend.

To work with your own deployment:

1. Clone the repository.
2. Configure Firebase Authentication.
3. Configure your Firestore database.
4. Deploy the Firestore security rules.
5. Configure the application Firebase credentials.
6. Serve the project over HTTPS.
7. Deploy the static application to your preferred hosting provider.

HTTPS is important for production PWA features and camera-based scanning.

---

# 🔥 Firebase Setup

MyLib relies heavily on Firebase.

At minimum, the project expects:

- Firebase Authentication
- Google Sign-In provider
- Cloud Firestore
- Appropriate Firestore indexes
- Firestore security rules

The application's Firebase configuration is located in `index.html`.

For a personal or production deployment, review and configure the Firebase project carefully rather than blindly reusing another project's configuration.

---

# 📚 Built-in User Guide

MyLib includes its own user guide at:

`/learn.html`

The guide explains the basic workflow of:

**Add → Organize → Collaborate → Read → Track**

This makes the application easier to learn without requiring external documentation.

---

# 🆕 What's New in v3.1?

v3.1 expands MyLib beyond a simple library catalog.

The release brings together a much broader reading ecosystem, including:

### 📚 Better library management

- Advanced search
- Multi-dimensional filtering
- Multiple viewing modes
- Favorites
- Wishlist
- Reading statuses
- Reading progress
- Highlights
- Metadata management
- Bulk operations

### 🤝 Stronger collaboration

- Collaboration requests
- Shared libraries
- Permission-aware access
- Shared activity
- Individual book transfers
- Bulk book transfers
- Collaboration statistics

### 🌐 Social reading

- Community feed
- Reviews
- Likes
- Comments
- Reader profiles
- Activity messages
- Infinite/load-more review browsing

### 📊 Deeper insights

- Rating distribution
- Genre analysis
- Author analysis
- Tag analysis
- Collection value
- Reading velocity
- Reading goals
- Finished-book statistics
- Collaborator statistics

### 🤖 AI-assisted library interaction

- AI Librarian
- Natural-language collection interaction
- Recommendation-oriented assistance
- AI search context
- Recent response caching

### 📱 Better application experience

- PWA installation
- Offline persistence
- Service Worker caching
- Automatic update detection
- Multiple themes
- Keyboard shortcuts
- Accessibility improvements
- Reduced-motion support
- Performance optimizations

---

# 🗺️ The MyLib Philosophy

MyLib is built around a simple belief:

**A personal library deserves to be treated as more than a database.**

A book can be:

- Something you own.
- Something you're reading.
- Something you want to read.
- Something that changed your thinking.
- Something you want to remember.
- Something you want to discuss.
- Something you want to share.

MyLib tries to bring all of those relationships together.

---

# 📌 Current Status

**Version:** `3.1.0`

**Platform:** Progressive Web App

**Primary technologies:** HTML, JavaScript, Tailwind CSS, Firebase

**Data:** Cloud Firestore with offline persistence

**Authentication:** Google Sign-In

---

# ❤️ Credits

Created with ❤️ by **Towfik Ahmed**

GitHub:  
https://github.com/towfikahmed0

---

## Preserve Every Word.

> **Every library has a story. MyLib helps you keep yours.**