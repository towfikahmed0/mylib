# AGENTS.md

Persistent context for AI agents working in this repository.
Read this fully before touching code. Do not re-derive what is written here.

---

## Project

MyLib — personal library app backed by Firebase (Firestore + Auth).
UI must keep behaving as it does today. This migration is a data-layer
change, not a redesign.

---

## Core architecture (non-negotiable)

Two collections, two responsibilities:

  bookCatalog/{bookCatalogId}   -> "What book is this?"   (shared, public-ish)
  userBooks/{userBookId}        -> "What does this user do with it?" (private)

Diagram:

  bookCatalog (title, authors, isbn, cover, description, publisher, ...)
        │
        │ bookCatalogId
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
    userBooks      userBooks      userBooks
    (User A)       (User B)       (User C)

Rule of thumb:
  - If the value is the same for every user who has the book -> bookCatalog.
  - If the value is per-user -> userBooks.

---

## Hard rules

1. NEVER store user-specific data in bookCatalog.
   Forbidden fields: userId, status, shelfId, isWishlist, notes, rating,
   review, readingProgress, dateStarted, dateFinished, dateAdded,
   personalTags, personalValue.

2. NEVER store bibliographic data in userBooks.
   Forbidden fields: title, authors, isbn, coverUrl, description,
   publisher, publicationYear, categories.
   (Exception: a future, explicitly-designed personal override field.
   Do not add one without being asked.)

3. Deterministic IDs.
   - bookCatalog/{normalizedIsbn13} when ISBN-13 is available.
   - bookCatalog/{autoId} otherwise (no-ISBN path).
   - userBooks/{userId}_{bookCatalogId} — one relationship per user per book.

4. Every add flow goes through addBookToUserLibrary().
   Manual, barcode, import, external API — all of them.
   No duplicated "find-or-create catalog" logic anywhere else.

5. Delete from a user's library removes ONLY the userBooks document.
   Never delete bookCatalog from a user action. Other users may reference it.

6. Transfer creates a destination userBooks and removes the source userBooks.
   Never duplicates bookCatalog. Never copies notes/rating/review unless an
   explicit flag says to.

7. Privacy by default.
   Never read, write, log, send to AI, or include in a report any other
   user's userBooks fields.

8. Library view = userBooks (current user) + bookCatalog (referenced).
   Never "all bookCatalog documents".

9. No N+1 queries. Always batch catalog fetches:
   chunk ids in groups of 10, use where(documentId(), 'in', chunk).

10. No data migration scripts. There is no production data to migrate.

11. Do not redesign unrelated UI. Compose catalog + userBook into the
    existing book shape so components keep working.

---

## Normalization rules

ISBN:
- Strip `-` and whitespace, uppercase `X`.
- ISBN-10 <-> ISBN-13 conversion where valid.
- Store both isbn10/isbn13 AND normalizedIsbn10/normalizedIsbn13.
- Match only on normalized values, never on raw strings.

Title / author:
- lowercase, collapse whitespace, trim.
- Store as normalizedTitle (string) and normalizedAuthors (string[]).

Match priority for "is this the same book?":
  1. normalizedIsbn13
  2. normalizedIsbn10
  3. reliable external id (provider + id)
  4. normalizedTitle + normalizedAuthors + publication info (cautious;
     show a "possible existing book" confirmation UI, never silent-merge)

Different ISBN = different edition. Do not auto-merge by title alone.

---

## Catalog write policy

- Authenticated users may READ bookCatalog.
- Authenticated users may CREATE a new catalog record when adding a book
  that does not exist yet.
- Users must NOT freely overwrite existing catalog metadata.
  Canonical record stays stable. If metadata correction is needed later,
  it goes through an admin/moderation path (not implemented yet — flag it,
  do not invent it).
- If a user uploads a cover for an existing catalog book, reuse the
  existing canonical coverUrl. Do not replace it silently.

---

## Firestore security model

bookCatalog:
  read:   signed in
  create: signed in
  update: original creator OR admin only
  delete: admin only

userBooks:
  read:   signed in AND resource.data.userId == request.auth.uid
  create: signed in AND request.resource.data.userId == request.auth.uid
  update: signed in AND resource.data.userId == request.auth.uid
          AND request.resource.data.userId == request.auth.uid
  delete: signed in AND resource.data.userId == request.auth.uid

Merge into existing rules. Do not blindly replace the whole file.

---

## Required composite indexes

Add only what actual queries need. Expected:

  userBooks:  userId + isWishlist + dateAdded
  userBooks:  userId + status
  userBooks:  userId + shelfId
  userBooks:  userId + bookCatalogId

  bookCatalog: normalizedIsbn13
  bookCatalog: normalizedIsbn10
  bookCatalog: normalizedTitle + normalizedAuthors (array-contains)

---

## Services layout

Follow existing project conventions (adapt paths if they differ).

  src/types/book.ts               BookCatalog, UserBook, ComposedBook
  src/utils/isbn.ts               normalizeIsbn, isbn10ToIsbn13, isbn13ToIsbn10
  src/utils/normalize.ts          normalizeTitle, normalizeAuthor
  src/services/bookCatalogService  findCatalogByIsbn, findCatalogByMetadata,
                                   createCatalogBook, updateCatalogBook
  src/services/userBooksService    getUserBooks, getUserBook,
                                   addBookToUserLibrary, updateUserBook,
                                   deleteUserBook, transferUserBook,
                                   batchGetCatalog
  src/hooks/useLibraryBooks        composition hook: returns { ...catalog, userBook }

addBookToUserLibrary signature (conceptual):

  addBookToUserLibrary(userId, bookInput, personalData)
    -> { catalogId, userBookId }
    throws ALREADY_IN_LIBRARY when the user already has that catalog book.

Use Firestore transactions for:
  - addBookToUserLibrary on the ISBN path
  - transferUserBook
Document the small race on the no-ISBN metadata-match path.

---

## Error handling

Surface clean messages, never raw Firebase errors:
  INVALID_ISBN, ISBN_NOT_FOUND, METADATA_PROVIDER_FAILED,
  SCAN_FAILED, CAMERA_PERMISSION_DENIED, CATALOG_LOOKUP_FAILED,
  ALREADY_IN_LIBRARY, PERMISSION_DENIED, NETWORK_ERROR,
  MISSING_CATALOG_RECORD (orphaned userBook — show fallback, log, do not crash)

---

## What lives where (quick map)

Shared (bookCatalog)      Personal (userBooks)
------------------------  --------------------------
title                     status
subtitle                  shelfId
authors                   isWishlist
isbn10 / isbn13           notes
description               rating
publisher                 review
publicationYear/Date      readingProgress
edition                   dateStarted / dateFinished
language                  dateAdded
pageCount                 personalTags
categories                personalValue
coverUrl
externalIds
normalized* fields
metadataSource/Version

---

## When in doubt

Ask: "Is this the same for every user who owns the book?"
  Yes -> bookCatalog.
  No  -> userBooks.

If a change would put user data into bookCatalog, or bibliographic data
into userBooks, or delete a catalog record on a user action, stop and flag it.

---

## Working style for agents

- Inspect before editing. Prefer reading real files over guessing.
- Make the smallest clean change that satisfies the request.
- Do not introduce new libraries or patterns unless asked.
- Do not add fields, flags, or abstractions "just in case".
- Do not write a data migration script.
- After edits, list every file changed and any unresolved edge cases.
- If a requirement is ambiguous, ask one short question instead of guessing.