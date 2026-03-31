# My Lib · Your Intelligent Library Companion

My Lib is a modern, feature-rich personal library manager designed to help you organize your book collection with ease. Built with cloud synchronization, offline support, and powerful AI integration, My Lib turns your reading list into an interactive journey.

## 🎯 Goals & User Benefits

*   **Centralized Organization**: Keep all your physical and digital books in one place with a beautiful, responsive interface.
*   **Intelligent Discovery**: Use the built-in AI Librarian to get personalized recommendations and insights into your reading habits.
*   **Precision Tracking**: Monitor your reading progress with granular control and celebrate your milestones.
*   **Seamless Collaboration**: Share your library with partners, view each other's collections, and exchange books.
*   **Always Accessible**: Works offline and across all your devices thanks to Firestore persistence and PWA support.

---

## ✨ Features & How They Work

### 🤖 AI Librarian
The AI Librarian is your personal reading consultant, powered by Google's Gemini AI. It understands your entire collection and helps you decide what to read next.

*   **Interactive Chat**: Open the chat bubble to ask questions about your books or request summaries.
    *   *Example Prompt*: "Based on my collection, recommend a short sci-fi novel I haven't finished yet."
*   **Mood-Based Recommendations**: In the Insights tab, choose a "Reading Mood" (like *Adventurous* or *Thoughtful*) to see curated picks from your library.
*   **AI Metadata Suggestions**: When adding a book manually, use the "Suggest with AI" (lightning bolt) button to automatically fill in the author, genres, and a concise summary.

### 📚 Smart Library Management
My Lib makes data entry effortless and ensures your collection stays clean.

*   **QR & Barcode Scanning**: Use your device's camera to instantly scan ISBNs and add books to your library or wishlist.
*   **Duplicate Detection**: The system automatically checks for existing titles or ISBNs in your library to prevent double-entry.
*   **CSV Import/Export**: Migrate your collection from other platforms.
    *   *Import Example*: Upload a CSV with columns like `Title`, `Author`, and `Status`. My Lib even includes a unique **"Undo"** feature if an import doesn't go as planned.
    *   *Export*: Download your entire collection as a CSV for backups or sharing.

### 📈 Reading Progress & Status
Track your journey through every book with specialized UI elements.

*   **Status Cycling**: Quickly toggle between *Want to Read*, *Reading*, and *Finished* directly from the book card.
*   **Granular Progress**: In the book details, use the slider or number input to update your percentage.
    *   *Celebratory Feedback*: Reaching 100% triggers a special celebration and updates your reading goal progress.
*   **5-Star Ratings & Reviews**: Rate your books and write detailed reviews. Your ratings contribute to the "Average Rating" seen by your collaborators.

### 📊 Insights & Analytics
Visualize your reading habits through the dedicated Insights dashboard.

*   **Yearly Reading Goal**: A visual progress ring tracks how many books you've finished against your target.
*   **Monthly Activity**: A dynamic bar chart shows your reading volume throughout the year.
*   **Metadata Distribution**: See your most-read genres, top authors, and most used tags in interactive lists that act as filters for your library.

### 🤝 Collaboration
Reading is better together. My Lib includes deep social features.

*   **Library Sharing**: Add partners by email to view their collections and read their reviews.
*   **Book Transfers**: Want to give a book to a friend? Use the **Transfer Request** system. You initiate the transfer, and they accept it in their settings to move the book to their library.
*   **Collaborator Reviews**: See what your partners thought of a book directly on the details page.

---

## 🛠 Setup & Configuration

To get started with My Lib, you'll need to configure a few things:

1.  **Firebase Configuration**: The application requires a Firebase project for Authentication and Firestore. Replace the `firebaseConfig` object in `index.html` with your project's credentials.
2.  **Gemini AI API Key**: To enable the AI Librarian, go to the **Settings** tab in the app and enter your Google Gemini API Key. You can also select which Gemini model you'd like to use (e.g., `gemini-1.5-flash`).
3.  **Installation**: Since My Lib is a Progressive Web App (PWA), you can "Install" it on your mobile device or desktop for a native experience and offline access.

---

*My Lib · Built for readers, by readers.*
