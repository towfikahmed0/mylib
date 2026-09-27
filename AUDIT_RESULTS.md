  Security Audit — firestore.rules + index.html

  Part 1 — Verification of previously claimed fixes

  No issue found (actually fixed/verified):

  - Collaboration request state machine — firestore.rules:243-253. Bounded: pre-state must be pending; only
  toUserId may reach accepted/rejected, only fromUserId may reach cancelled;
  affectedKeys().hasOnly(['status','updatedAt']). Self-acceptance and terminal-state rewrites are
  impossible. ✅
  - Partnership creation requires recipient acceptance — 154-176. Ties to an accepted request, requires
  auth.uid == request.toUserId, exact participant match, userId1 < userId2, and closed flags. ✅
  - allowAddBooks/grantedBy integrity — 182-217. Grant records grantedBy == auth.uid (only the library owner
   can grant access to their own library); addedBy is immutable on books (291); grantedBy can't be forged
  via the unchanged branch. ✅
  - Partners can't touch owner-created books — 283-313. Partner path requires addedBy == auth.uid and an
  active grant; owner-created books are off-limits. ✅
  - Ownership transfer — 286-289. Only current owner, only to an active partner, addedBy/createdAt
  immutable. ✅
  - Unsubscribe enforcement + flag ownership — 209-216, activePartnership() 23-29. Each user changes only
  their own flag; partner reads/writes/activity are gated on activePartnership. ✅
  - Book request ownership — 371-391. Server verifies get(book).userId == toUserId, fromUserId == auth.uid,
  pending-only transitions. ✅
  - Borrow double-claim — 300-304. Requires borrowedBy to be empty before a claim; return clears it. ✅
  - Review create/update validation parity — 402-416. ✅
  - XSS: author/genre <option> + initials + jumpToBook — verified in index.html:3334, 3680, 4308, 4326,
  5034, 5252, 5268, 8614. All now escaped / converted to data-action. ✅
  - Chart.js pinning — index.html:118 → chart.js@4.4.1. ✅
  - No eval/new Function/document.write/insertAdjacentHTML; no javascript:/data:text/html URL sinks (export
  uses a blob URL only). ✅
  - Batch/UX error handling preserved — toggleLike (4987-5000), addComment (5084-5088), acceptBookRequest
  (8719-8729) all commit inside existing try/catch with UI rollback. ✅

  ───

  Part 2 — Findings

  R1 — HIGH (NEW: breaks an existing flow) — collection-group readingStatus read rule is unprovable

  - File/area: firestore.rules:321-325 (match /{path=**}/readingStatus/{statusId}), plus validReadingStatus
  75-88 and create/update 335-343.
  - Attack/impact: The app syncs via db.collectionGroup('readingStatus').where('userId','==',uid)
  (index.html:6186-6188). The rule adds statusId == request.auth.uid, a document-ID predicate that the query
   cannot prove → Firestore rejects the listener with PERMISSION_DENIED. Reading status, library stats,
  ratings, favorites and wishlist break for everyone. Separately, validReadingStatus only checks d.userId is
   string, so a crafted create can store a doc whose userId ≠ the owner (statusId).
  - Feature affected: reading status sync, stats, ratings, wishlist/favorites.
  - Why protection fails: doc-ID conditions require a matching query constraint; userId is never bound to
  statusId.
  - Minimal fix: wildcard read → resource.data.userId == request.auth.uid only; create/update → add
  request.resource.data.userId == statusId.
  - Break risk: low; restores prior behavior and tightens writes.

  R2 — HIGH — review like-count forgery (claimed fix is bypassable)

  - File/area: firestore.rules:421-427.
  - Attack: existsAfter(likes/uid) tests existence, not a transition. Any signed-in user can create
  reviews/{id}/likes/{self} (allowed, 439-442), then repeatedly call update({likesCount: increment(1)})
  alone — existsAfter sees the pre-existing like doc, so every +1 passes. Result: arbitrary inflation of any
   review's likesCount; symmetrically, a user with no like doc can drive any review's count down
  indefinitely.
  - Feature: review likes/counters.
  - Why protection fails: no proof the like doc changed in this request.
  - Minimal fix: +1 → !exists(/.../likes/$(request.auth.uid)) && existsAfter(...); -1 → exists(...) &&
  !existsAfter(...).
  - Break risk: low; frontend already batches the like doc + counter.

  R3 — MEDIUM (remains) — commentsCount can be incremented without proof

  - File/area: firestore.rules:431-433. Any signed-in user can +1 any review's commentsCount repeatedly.
  Full proof needs a deterministic comment ID (the rules language can't reference a generated add). Minimal
  fix: use doc(uid+'_'+n) scheme or accept as residual. Break risk: medium.

  R4 — MEDIUM — books accept arbitrary extra fields (no allowlist)

  - File/area: firestore.rules:271-305 / validBookData 55-72.
  - Attack: Only title/author/description/isbn/coverUrl/tags/categories/copyType are validated. Fields like
  progress, rating, averageRating, owner, gifterName, borrowedBy are unvalidated and injectable (by a
  partner into an owner's library, or a user into their own books). Several are rendered without guards
  (index.html:3804 '★'.repeat(book.rating), 5961 style="width: ${book.progress}%").
  - Fix: per-role affectedKeys().hasOnly([...]) + numeric validation. Break risk: medium (must enumerate the
   full legitimate field set).

  R5 — MEDIUM — users allows arbitrary field writes

  - File/area: firestore.rules:109-112 (only uid immutable).
  - Attack: a user can inject arbitrary fields / overlarge strings into their public profile;
  totalBooksCount/completedBooksCount are self-reported. Rendered values are mostly escaped, but it's an
  unbounded write surface.
  - Fix: profile field allowlist. Break risk: low/medium.

  X1 — HIGH — unescaped Firestore document IDs injected into HTML

  - File/area: index.html:5862, 5948 (data-book-id="${book.id}"), 5878/5899/5950/5963
  (data-value="${book.id}"), 8975/8988/8990 (id="book-header-/dropdown-/arrow-${book.id}"), 9013/9019
  (id="request-btn-container-/req-btn-${book.id}"), 8449 (id="comments-${rev.id}"), 5012/5019/5042 (comment
  container ids).
  - Attack: rules impose no constraint on bookId/reviewId. A signed-in user can create a book or review with
   a crafted ID (doc('x"><img src=x onerror=...>').set(...)); reviews are world-readable. When any user
  renders their library / Explore / visited library, the raw ID breaks out of the attribute (stored
  HTML/attribute injection).
  - Feature: library grid/list, Explore reviews, visited library, comments.
  - Why fails: IDs are attacker-chosen and not escaped at these sinks (sibling data-value uses on the same
  lines do call escapeHTML — inconsistency).
  - Fix: wrap every book.id/rev.id/reviewId in escapeHTML(). Break risk: none (getAttribute auto-decodes).

  X2 — HIGH — unescaped coverUrl in the visited-library modal

  - File/area: index.html:3800 — <img src="${coverUrl}"> (collaborator's book).
  - Attack: rules only require ^https?:// (firestore.rules:65-68) and client isValidImageUrl uses new URL(),
   both of which accept https://x" onerror="...". Rendered raw → attribute injection.
  - Fix: escapeHTML(coverUrl). Break risk: none.

  X3 — MEDIUM — CSP offers no real protection AND blocks the app's own inline handlers

  - File/area: index.html:6-18 (CSP), inline scripts 19, 42, 50 (+ the app script block), ~74
  onclick=/onchange= attributes (e.g., 2067, 3158-3280, 3329-3339, 1408/1451/3606).
  - Finding: the nonce mylib2026static is a compile-time constant → an attacker who can inject a <script
  nonce="mylib2026static"> bypasses script-src. Worse, per CSP a nonce does not authorize inline
  event-handler attributes (no 'unsafe-inline'), so all ~74 inline handlers are blocked → tab navigation,
  filters, bulk actions, undo/reload toast buttons, etc. are non-functional. The nonce thus provides zero
  protection while currently breaking controls.
  - Fix: externalize JS to script-src 'self' and migrate remaining handlers to the existing data-action
  delegation. Break risk: high only if done partially (must convert all handlers together).

  X4 — MEDIUM — supply chain: unpinned/unscreenendered dependencies, no SRI

  - File/area: index.html:34 (font-awesome 4.7.0), 36 (DOMPurify 3.2.4), 41 (gtag, unpinned), 49
  (cdn.tailwindcss.com, unpinned runtime), 102-103 (Google Fonts, unpinned), 106 (html5-qrcode 2.3.8),
  108-110 (Firebase 10.12.0), 112 (PapaParse 5.4.1), 115 (confetti 1.9.3), 118 (Chart.js 4.4.1).
  - Finding: no external script/style carries integrity; Tailwind + gtag are unversioned. Fix:
  self-host/bundle + SRI. Break risk: medium (SRI needs crossorigin + verified hashes).

  X5 — LOW — rev.category / counters unescaped; rating/style sinks

  - index.html:8424 ${rev.category || 'Review'} raw (rules constrain the enum now, but legacy docs may not).
   8442/8446 counters raw (numeric-bounded). 3804 '★'.repeat(book.rating) and 5961 style-width from
  unvalidated book fields (ties to R4) can throw/DoS or inject into style. Fix: escape + validate numerics.

  Other (LOW / INFO)

  - bookRequests create doesn't check the book is currently available (minor UX/integrity).
  - collaborationRequests create doesn't validate the recipient exists; no rate limiting → spam.
  - Dead code: partnershipExists/isLibraryMember unused; _jsAuthor/_jsOwner computed but unused;
  partnershipData mis-indented (cosmetic).
  - Single allowAddBooks flag cannot represent a grant in both directions; a stale grantedBy can strand a
  grant (functional, not a vuln).
  - AI keys in sessionStorage (BYOK) — remains, XSS-exposed. Bullet: mostly mitigated once X1/X2/X3 are
  fixed.
  - activity-feed bulk-transfer incompatibility — index.html:3546-3555 writes userId: targetUserId while the
   rule requires request.auth.uid == userId (firestore.rules:356-358), so the batch fails. Pre-existing
  (same under the old rules).

  ───

  Part 3 — Explicit status

  Fixed (verified): collab state machine; partnership creation; add-vs-edit/delete; unsubscribe
  integrity+enforcement; book-request ownership; ownership transfer; borrow race; review create/update
  validation; option/initials/jumpToBook XSS; Chart.js pin.

  Remains (as previously reported): static CSP nonce + inline scripts/handlers (X3 — worse than reported);
  Tailwind Play CDN; no SRI; commentsCount forgery (R3); AI keys in sessionStorage; no full book field
  allowlist (R4); email enumeration / broad profile reads (design); activity-feed bulk-transfer
  incompatibility; emulator tests not run (no Java).

  NEW issues introduced/left by the patch: R1 (the added statusId predicate likely breaks the reading-status
   listener); R2 (the like fix is bypassable); X1/X2 (unescaped doc IDs/coverUrl are the same class the
  patch set out to close).

  Existing features accidentally broken: reading-status sync (R1); all inline-handler controls under CSP
  (X3); books with empty title / reviews with body <10 can no longer be updated (firestore.rules:58, 94);
  partner highlight-editing of owner books is now (correctly) denied.

  ───

  Verdict

  1. BLOCK DEPLOYMENT — R1 is a likely production outage of reading-status sync, R2 allows arbitrary
  cross-user counter forgery, and X1/X2 leave attacker-deliverable HTML-injection sinks.
  1. Top 5 remaining risks
    1. Like-count forgery via existsAfter without a transition guard (R2).
    2. collectionGroup('readingStatus') rejection from the doc-ID predicate (R1).
    3. Unescaped document IDs / coverUrl (X1/X2).
    4. CSP that neither protects (static nonce) nor works (~74 blocked inline handlers) (X3).
    5. No field allowlists on books/users (R4/R5).
  2. Exact emulator tests that must pass before production
    - Collab state machine: A→B request; assert A cannot set accepted/rejected; B can; A can cancelled; any
  update after accepted/rejected/cancelled DENIED.
    - Partnership create: no request DENIED; accepted-by-fromUserId DENIED; mismatched userId1/2 DENIED;
  userId1>userId2 DENIED; valid accepted match ALLOWED.
    - Partner perms: partner edit/delete owner-created book DENIED; partner edit/delete own addedBy book
  ALLOWED; partner create into owner library DENIED without grant, ALLOWED with addedBy==self.
    - Grants: non-owner grant DENIED; forged grantedBy DENIED; allowAddBooks flip by wrong actor DENIED.
    - Unsubscribe: user1 changing user2Unsubscribed DENIED; own-flag toggle ALLOWED; after unsubscribe,
  partner books/activityFeed read+write DENIED.
    - Book requests: requesting an unrelated user's book DENIED; own book DENIED; valid owned book ALLOWED;
  terminal transitions DENIED; books read/list with where('userId','==',uid) for partner SUCCEEDS.
    - Ownership transfer: non-owner DENIED; owner→non-partner DENIED; owner→active partner ALLOWED.
    - Reviews: lone likesCount+1 with no like doc DENIED; +1 batched with like create ALLOWED; repeat +1
  after the like doc exists must be DENIED (currently ALLOWED — R2); commentsCount+1 ALLOWED, arbitrary set
  DENIED; invalid content update (short body, bad category, rating >5) DENIED.
    - readingStatus: write for another statusId DENIED; own write ALLOWED;
  collectionGroup('readingStatus').where('userId','==',uid) must SUCCEED (currently fails — R1); delete
  works (no request.resource dependency).
    - Borrow race: two concurrent accept batches for one book → exactly one succeeds.
    - Payloads: create book with crafted ID / coverUrl containing quotes and a review with a quote-bearing
  ID; assert no injected element/attribute renders and no CSP errors — plus a client render test asserting
  escaping (X1/X2).

  No files were modified.