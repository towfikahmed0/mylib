# Firestore Security (Current State)

This document describes the checked-in [Firestore rules](firestore.rules), client flows, types, and Firebase configuration. It is not a security audit of the deployed Firebase project. No secrets or API keys are included. **Status labels refer to this repository only.** Rules are the authorization boundary; route guards and UI checks are not substitutes.

## Authentication and Admin Model

- **Implemented:** Firebase Authentication uses Google popup sign-in. `AuthProvider` loads `users/{uid}` after authentication and creates a profile when missing. See [src/features/auth/AuthContext.tsx](src/features/auth/AuthContext.tsx) and [src/lib/firebase.ts](src/lib/firebase.ts).
- **Implemented:** Firestore `isAdmin()` reads `users/{auth.uid}.role == 'admin'`. New client-created profiles must have `role: 'user'` and `plan: 'free'`; ordinary self-updates keep existing role/plan values fixed. Admin-only rules protect reports and `adminConfig`.
- **Partially implemented:** `/admin` has a client-side role guard, but the page is a placeholder. Firestore admin permissions do not establish that the planned admin product is implemented.
- **Unknown / cannot verify from repo:** How any admin role is provisioned in the deployed project, whether Cloud Functions or other privileged services exist there, and whether deployed rules match this file. `firebase.json` has no Functions target and the repository contains no Functions source.

## Collections and Access Boundaries

| Path | Data / ownership | Checked-in access boundary |
| --- | --- | --- |
| `users/{uid}` | Public profile fields, role/plan, privacy preferences, aggregate counts | `get` is public; `list` requires sign-in. Self-create is constrained to own UID, role `user`, plan `free`. Self-update freezes UID/role/plan, but does not allowlist all other fields. Admin or owner can delete. |
| `users/{uid}/private/{documentId}` | Private profile data such as email, phone, address, contract number, and AI analysis fields | Read/write only by the matching signed-in UID. |
| `users/{uid}/followers/{followerUid}` | Public follower graph | Read is public; a signed-in user can create/delete their own follower edge, subject to the target not being self. Profile count updates have a corresponding rule check. |
| `users/{uid}/following/{followedUid}` | Owner's following graph | Read/write only by the matching signed-in owner (create/delete checks). |
| `users/{uid}/notifications/{id}` | In-app notifications | Recipient can read/update/delete; any signed-in actor can create under a recipient path if `actorUserId` matches and text/link lengths fit. |
| `userLookup/{email}` | Email-to-UID lookup | Signed-in exact get; signed-in list with query limit at most one. Writes require the document email to match the caller's token email and UID. |
| `usernameLookup/{username}` | Public username-to-profile lookup | Public exact get; list limit at most ten. Signed-in create/update requires only that the new document's `uid` is the caller. Delete checks existing UID. |
| `books/{bookId}` | Catalog record, owned by `userId`; optional `isInLibrary` boolean separates owned/finished books from the active library | Read by owner, active partner (when owner's library setting is public or collaborators), current borrower (when `borrowedBy` is the caller), or anyone when owner's library setting is public. Create/update validates a small required-field set and validates `isInLibrary` when present. Missing `isInLibrary` is treated by the client as `true` for existing records. See the high-risk grant/update issue below. |
| `books/{bookId}/readingStatus/{uid}` | Per-user status, rating, progress, wishlist/favorite, timer, highlights | Read if `resource.data.userId` is caller. Write if path UID and resulting `userId` are caller. |
| `partnerships/{id}` | Collaboration state and add-book permission | Read/update/delete by either participant. Create requires an accepted request in the same batch and a recipient check. Update field restrictions are insufficient; see finding F-03. |
| `collaborationRequests/{id}` | Invite request | Read by either participant; create requires caller as sender and pending status; participant updates are restricted to `status`/`updatedAt`, but valid transitions are not checked. |
| `bookRequests/{id}` | Borrow request and handover state; owner contact fields only after explicit sharing | Read by requester or owner. Creation requires an eligible signed-in requester, private contract number/address, permitted owner relationship, an available owner book, and the paired pending-request book lock in the same atomic write. Owner decision, cancellation, and borrower receipt confirmation are actor- and state-checked against the book/loan transition. |
| `loans/{requestId}` | Active/return-pending/returned lending relationship; request ID is the loan document ID | Read only by the owner and borrower. Create is tied to the matching accepted request, confirmed receipt, book state, and yearly counter. Updates are limited to borrower return requests, owner return confirmation, and owner reminders. Delete is denied. |
| `loanCounters/{year}` | Monotonic Loan # allocation | Signed-in get only; create/update must be linked atomically to the borrower's active loan. List/delete are denied. |
| `reviews/{id}` | Review/post and counters | Reads use the post's audience field (`visibility`); missing values on legacy posts default to public. Create pins author and audience to the profile setting. Saving a changed Posts setting migrates existing records (atomically when there are at most 499; larger sets are batched). |
| `reviews/{id}/likes/{uid}` | Review likes | Read and create/delete require access to the parent post; writes are restricted to the signed-in user's UID path. |
| `reviews/{id}/comments/{id}` | Review comments | Read and create require access to the parent post; author/admin update/delete also require parent-post access. |
| `shelves/{id}` | User shelf and smart-shelf metadata | Read if `isPublic` or owner; create/update/delete by owner. |
| `reports/{id}` | User-submitted reports | Signed-in create requires caller reporter ID and pending status; read/update/delete admin-only. |
| `activityFeed/{id}` | Library event, keyed by `libraryId` | Read by library owner or active partner (when owner's `privacySettings.feed` is not private). Create requires caller as actor and own/active-partner library. No update/delete. |
| `adminConfig/{id}` | Admin feature/config data | Admin-only read/write. |

`readingStatus` is also matched using a collection-group wildcard rule. The project has composite indexes in [firestore.indexes.json](firestore.indexes.json). The PRD describes additional schema fields; only fields and access above are supported by current rules/code evidence.

## Borrowing Workflow

- **Implemented in checked-in client and rules:** A request and `pending_request` book lock are atomic. The owner can accept (which only changes the state to waiting for handover), explicitly share their phone/address, or decline. The borrower must confirm receipt before a loan is created and `borrowedBy`/`borrowDate` are synchronized. A borrower can request return confirmation; only the owner can close the loan and release the book. Reminders are limited to the lender and have a 24-hour cooldown.
- **Privacy boundary:** Contract number and address are read from the requester's private document only for server-rule eligibility and are not copied to a borrow request. Owner contact is copied only following the owner's explicit share action; request reads are limited to the two parties. Private profile documents remain owner-only.
- **Race control:** The request lock, request transitions, loan record, yearly Loan # counter, and book denormalized state are cross-checked with `getAfter`/`existsAfter` rules and client Firestore transactions. A standalone request without the paired lock is denied. Books with a request/loan lock cannot be transferred or deleted.
- **Repository boundary:** There is no Cloud Functions source/deploy target in this repository. Rules constrain client writes, but the workflow currently relies on Firestore client transactions rather than trusted server orchestration. Legacy arbitrary-text `borrowedBy` values cannot safely be converted to borrower UIDs without a verifiable accepted request; they require explicit data reconciliation before they can be represented as participant-visible loans.

## Security and Privacy Findings

Severity is a repository-based risk assessment, not a statement that an exploit has occurred. Findings describe remaining issues in the checked-in rules and app.

### F-01 — High: Add-book grants also authorize edits, deletes, and ownership changes

**Evidence:** `canAddToPartnerLibrary()` is used by `books/{bookId}` create, update, and delete rules. For updates, the rule validates required fields and freezes `createdAt`, but does not freeze `userId` or restrict changed keys. For deletion, the same add-grant helper is sufficient.

**Risk:** A collaborator whose owner granted permission to add books can also modify or delete existing books in that library and can change their `userId`. This is broader than an add-only permission and can remove or reassign the owner's catalog records.

**Recommended fix:** Make the grant authorize only creation of books in the owner's library. Require the owner for edits/deletes, or define narrowly allowlisted partner-edit fields if intended. Freeze `userId` on ordinary updates. Implement ownership transfer as a separate explicit operation with validated participants and a deliberate transfer workflow.

### F-02 — Medium: Library privacy settings partially hardened in rules

**Evidence:** Rules for `books/{bookId}` now enforce that active partners can only read books if the owner's `privacySettings.library` is `'public'` or `'collaborators'`, preventing unauthorized partner reads when the library is `'private'` (while preserving access for current active borrowers). Rules for `activityFeed/{id}` now enforce that active partners cannot read the library owner's activity feed documents when `privacySettings.feed == 'private'`. Other legacy `privacySettings` choices (wishlist, progress, reviews) remain client-filtered, while posts use `privacySettings.posts` audience migration.

**Risk:** A user's selected visibility for secondary data types (wishlist/progress/reviews) may still rely partly on client queries rather than database-level rules where evaluation is complex.

**Recommended fix:** Continue aligning UI queries with database rules across remaining subcollections and legacy fields. For per-user status/reviews where rule evaluation is impractical, use a carefully scoped server-side read path or a schema that rules can safely evaluate.

### F-03 — High: Partnership participants can rewrite permission state

**Evidence:** Partnership updates only pin `userId1` and `userId2`; there is no allowlist for other changed fields. Fields consulted by rules include `status`, `user1Unsubscribed`, `user2Unsubscribed`, `allowAddBooks`, and `grantedBy`.

**Risk:** Either participant can change collaboration state or grant metadata. A collaborator may be able to self-enable add permission by changing the grant fields, compounding F-01.

**Recommended fix:** Allowlist fields and valid transitions by actor. Only the library owner should change their add-books grant; derive/validate `grantedBy` from that owner. Restrict accepted/unsubscribe transitions to the appropriate participant and keep participant IDs immutable.

### F-04 — High: Public profile documents are world-readable and self-updates are not schema-allowlisted

**Evidence:** `users/{uid}` permits `get` to anyone. Self-updates freeze UID/role/plan but permit changes to other fields without an allowlist. A source comment says public profile docs intentionally omit email; the rule does not enforce that omission.

**Risk:** A client could add a sensitive field to the public profile document, where it would become readable to unauthenticated users. Future profile fields could unintentionally widen exposure.

**Recommended fix:** Keep private data only in the private subcollection and enforce an explicit public-profile field allowlist/type constraints on create and update. Consider separating public profile data from authorization/account metadata.

### F-06 — High: Comment counters can be incremented without a comment

**Evidence:** Review counter updates allow a `commentsCount` increase of one without checking `existsAfter()` for a new comment. The rule comment calls this best-effort and notes a full fix needs a Cloud Function. No Functions implementation is present in this repository.

**Risk:** Any signed-in client can forge comment counts, potentially repeatedly, causing misleading engagement data. The like counter does have a like-document existence check.

**Recommended fix:** Make counter changes provably atomic with comment create/delete, or move counter maintenance to a trusted backend transaction/trigger and deny direct client counter writes. Verify that any proposed backend is actually deployed before relying on it.

### F-08 — Medium: Any signed-in user can create notifications for arbitrary recipients

**Evidence:** Notification creation checks `actorUserId` and maximum title/body/link lengths, but does not require a relationship to the recipient, an allowed notification type, or an approved link format. Client notification helpers fan out notifications directly.

**Risk:** An authenticated user can write unsolicited notifications to arbitrary users and may supply misleading navigation links. The rule has no rate/fan-out boundary.

**Recommended fix:** Restrict recipient/notification types and link destinations, and consider moving fan-out to a trusted service with abuse controls. If direct writes remain, bind them to verifiable relationship or event documents.

### F-09 — Medium: Comment updates can change authorship and arbitrary fields

**Evidence:** Comment create checks `userId == request.auth.uid`, but update only checks the existing comment author (or admin); it has no changed-key allowlist and does not pin the resulting `userId`.

**Risk:** A comment author can rewrite attribution or other comment fields after creation, weakening auditability and downstream ownership checks.

**Recommended fix:** Restrict edits to intended content fields, freeze `userId`/creation metadata, and validate content length/type. Keep moderation-only changes in an explicit admin path.

### F-10 — Medium: User lookup exposes email-address membership to signed-in users

**Evidence:** Any signed-in user may get a `userLookup/{email}` document when they know the exact document ID; list queries are also permitted with a limit of one. The client uses this collection to resolve collaboration invitations by email.

**Risk:** The lookup supports invitation UX but also allows authenticated users to test whether a known email is registered and retrieve its UID.

**Recommended fix:** Decide whether this disclosure is acceptable for invitations. If not, resolve invites through a trusted, rate-limited endpoint or use an invitation flow that does not expose an email-to-UID directory. Keep the lookup limited to the minimum required data.

### F-11 — Low: Username lookup rules do not enforce canonical handle ownership

**Evidence:** A signed-in user may create/update any `usernameLookup/{username}` path when the resulting document's `uid` is their own. The rule does not verify that the path matches `users/{uid}.username`, enforce normalization/format, or limit aliases.

**Risk:** Users can reserve multiple aliases for their own profile or create lookup/profile inconsistencies. The UID check prevents claiming a lookup document as a different user's UID, but does not enforce canonical uniqueness.

**Recommended fix:** Validate the normalized path, canonical profile username, and old/new lookup updates atomically. Enforce one canonical handle per user and the intended format/uniqueness policy.

### F-12 — Low: Reports have minimal schema and abuse validation

**Evidence:** Report creation checks only that `reporterId` is the caller and `status` is `pending`; it does not validate target type/ID, reason length, or duplicate/rate limits. Admin-only reads and writes are enforced.

**Risk:** Users can submit malformed, oversized, duplicate, or irrelevant reports, increasing moderation load. Firestore's document size limit still applies, but is not a product-level validation rule.

**Recommended fix:** Require a supported target type, bounded reason, valid target reference, and sensible duplicate/rate controls while keeping report review admin-only.

## PRD Security Requirements: Status

| Requirement | Status | Evidence / note |
| --- | --- | --- |
| Owner/active-partner book access and schema checks | Partially implemented | Rules check required keys/types and ownership/partnership, but add grants authorize broader mutations and ownership changes (F-01). |
| Reading status private to its user | Implemented | Collection-group rule checks `resource.data.userId`; writes pin status UID and resulting user ID. This does not implement public/collaborator status visibility choices. |
| Role-based admin boundary | Partially implemented | Rules use the profile role and admin-only collections; role provisioning and deployed configuration are unknown, and the UI is a placeholder. |
| Like counter integrity | Partially implemented | Like docs are tied to caller UID and likes count checks doc existence in a batch. No runtime rules test was run as part of this documentation task. |
| Comment counter integrity | Planned / not present | Rules permit increments without a comment document; no repository Cloud Function is present (F-06). |
| Granular privacy | Partially implemented | Posts visibility (public, signed-in users, followers/active collaborators) is enforced in review rules and reflected on profiles/Explore. Legacy library/wishlist/progress/review/feed controls remain inconsistent (F-02). |
| Opt-in contact sharing for book requests | Planned / not present | Phone/address are copied automatically into a request (F-05). |
| Cloud Functions / FCM / push security | Unknown / cannot verify from repo | No corresponding source or Firebase deployment target is checked in. Do not assume deployed services exist. |

## Scope and Follow-up

This is a repository inspection, not a rules emulator test, penetration test, or review of Firebase Console/IAM/App Check settings. **Unknown / cannot verify from repo:** deployed rules, Auth provider settings, App Check enforcement, indexes actually deployed, backup configuration, Cloud Functions, FCM, and any out-of-repository administrative provisioning. Verify these with the project owner before using this document as a deployment security attestation.