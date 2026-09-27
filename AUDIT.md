  MyLib Security Analysis — firestore.txt + index.html

  1. PARTNERSHIP PERMISSIONS

  Where is allowAddBooks read? (rules, by line in firestore.txt)

  - L23 — helper partnershipAllowsAdd: && p.data.allowAddBooks == true
  - L102 — partnerships create: && request.resource.data.allowAddBooks == false
  - L115 — partnerships update (grant branch): (resource.data.allowAddBooks == false
  - L116 — && request.resource.data.allowAddBooks == true
  - L119 — || (resource.data.allowAddBooks == true
  - L120 — && request.resource.data.allowAddBooks == false
  - L124 — || (request.resource.data.allowAddBooks == resource.data.allowAddBooks
  - L128 — hasOnly([... 'allowAddBooks' ...])

  Where is allowAddBooks written? (JS call sites, index.html)

  - L2933–2943 — partnership creation: .set({ ... allowAddBooks: false, ... }), value on L2940.
  - L2989–3000 — window.updatePartnershipPermission: .update({ allowAddBooks: allowAddBooks, ... }), value
  on L2992.
  - UI trigger: checkbox on L3063 (data-action="toggle-partnership-perm"), dispatched at L11487–11488 →
  window.updatePartnershipPermission(value, el.checked).

  Does the UI ever set grantedBy?
  No. grantedBy appears nowhere in index.html (grep: no matches).

  If User A turns allowAddBooks on with grantedBy = A, can User B…?

  - Add to A's library? Yes. partnershipAllowsAdd(B, A) evaluates grantedBy == uid2, and uid2 is the library
   owner (A) in that call, so the grant satisfies the check.
  - Edit A's books? Yes. books update uses canEditLibrary(B, resource.data.userId=A) → partnershipAllowsAdd
  → true.
  - Delete A's books? Yes. books delete uses canEditLibrary(B, A) → true.

  Exact read/update rule expressions (verbatim, firestore.txt)

  Read (L86–87):

  allow read: if isSignedIn() && request.auth.uid == resource.data.userId1;
    allow read: if isSignedIn() && request.auth.uid == resource.data.userId2;

  Update (L107–128):

  allow update: if isSignedIn()
      && (request.auth.uid == resource.data.userId1
          || request.auth.uid == resource.data.userId2)
      && request.resource.data.userId1 == resource.data.userId1
      && request.resource.data.userId2 == resource.data.userId2
      && request.resource.data.status == resource.data.status
      && (
        // Grant on: the library owner turns allowAddBooks on and records themselves as granter.
        (resource.data.allowAddBooks == false
         && request.resource.data.allowAddBooks == true
         && request.resource.data.grantedBy == request.auth.uid)
        // Revoke: allowAddBooks turns off and the grant is reset.
        || (resource.data.allowAddBooks == true
            && request.resource.data.allowAddBooks == false
            && request.resource.data.grantedBy == '')
        // Unchanged: the recorded granter must not change.
        // Uses .get() with a default so legacy docs that predate grantedBy can be migrated.
        || (request.resource.data.allowAddBooks == resource.data.allowAddBooks
            && request.resource.data.get('grantedBy', '') == resource.data.get('grantedBy', ''))
      )
      && request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['allowAddBooks', 'user1Unsubscribed', 'user2Unsubscribed', 'updatedAt', 'grantedBy']);

  2. UNSUBSCRIBE HANDLING

  Rules that check user1Unsubscribed / user2Unsubscribed (by rule + line):

  - books read (partner branch) — L171 (user1Unsubscribed) and L174 (user2Unsubscribed). This is the only
  rule that tests the flag values.
  - Note: L128 lists both keys inside hasOnly(...) for partnerships update, but that is a key-name
  allowance, not a value check.

  Rules that grant partner access but do NOT check them:

  - books create — L179 (canEditLibrary)
  - books update — L196 and L215 (canEditLibrary)
  - books delete — L219 (canEditLibrary)
  - activityFeed read (partner branch) — L252–253 (raw status == 'accepted')
  - activityFeed create — L257 (canEditLibrary)
  - partnerships read — L86–87

  The shared helpers partnershipAllowsAdd (L20–27) and canEditLibrary (L32–34) never inspect the unsubscribe
   flags, so every rule routed through them ignores unsubscribe.

  3. OWNERSHIP TRANSFER

  Expression in books update that permits changing userId (verbatim, L214–215):

  || (resource.data.userId == request.auth.uid
        && canEditLibrary(request.auth.uid, request.resource.data.userId))

  Does it require the receiver to have granted the sender permission?
  Yes. canEditLibrary(sender, receiver.data.userId) → partnershipAllowsAdd(sender, receiver) requires
  allowAddBooks == true and grantedBy == receiver (uid2). So the receiver must have granted the sender.

  4. BOOK REQUESTS

  bookRequests create rule (L269–272):

  allow create: if isSignedIn()
      && request.auth.uid == request.resource.data.fromUserId
      && request.resource.data.fromUserId != request.resource.data.toUserId
      && request.resource.data.status == 'pending';

  Is there any check that toUserId owns bookId?
  No. bookId is not referenced at all.

  5. REVIEW COUNTERS

  Review update rule verbatim (L305–323):

  allow update: if isSignedIn() && (
      // Owner editing review content.
      (resource.data.userId == request.auth.uid
       && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['body', 'rating', 'category', 'updatedAt']))
      ||
      // Counters (likesCount/commentsCount) — a signed-in user may change either counter
      // by exactly +1 or -1 per write. This blocks the "set likesCount to 999999" attack
      // while keeping the existing like/comment UI functional.
      // TODO: replace with a Cloud Function that increments on writes to /likes and /comments.
      (request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['likesCount', 'commentsCount'])
       && (request.resource.data.likesCount == resource.data.likesCount
           || request.resource.data.likesCount == resource.data.likesCount + 1
           || request.resource.data.likesCount == resource.data.likesCount - 1)
       && (request.resource.data.commentsCount == resource.data.commentsCount
           || request.resource.data.commentsCount == resource.data.commentsCount + 1
           || request.resource.data.commentsCount == resource.data.commentsCount - 1))
    );

  Can any signed-in user increment likesCount by more than 1 in a single write?
  No. The branch allows only same, +1, or -1.

  6. CDN SUPPLY CHAIN

  Every <script src> and <link rel="stylesheet"> in index.html, with integrity status:

  ┌─────────┬─────────────────────────────────────────────────────────────────────────────────┬────────────┐
  │ Line    │ Asset                                                                           │ integrity? │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 34      │ https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min… │ No         │
  │         │ (stylesheet)                                                                    │            │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 36      │ https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js            │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 41      │ https://www.googletagmanager.com/gtag/js?id=G-N049QSWR4Y                        │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 49      │ https://cdn.tailwindcss.com                                                     │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 102–103 │ https://fonts.googleapis.com/css2?family=Fraunces…&family=Inter…&family=Ralewa… │ No         │
  │         │ (stylesheet)                                                                    │            │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 106     │ https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js                        │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 108     │ https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js               │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 109     │ https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js              │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 110     │ https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js         │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 112     │ https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js         │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 115     │ https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js │ No         │
  ├─────────┼─────────────────────────────────────────────────────────────────────────────────┼────────────┤
  │ 118     │ https://cdn.jsdelivr.net/npm/chart.js                                           │ No         │
  └─────────┴─────────────────────────────────────────────────────────────────────────────────┴────────────┘

  No asset carries an integrity attribute.

  7. CSP NONCE

  CSP meta tag verbatim (index.html L6–18):

  <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' 'nonce-mylib2026static' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com
  https://unpkg.com https://www.gstatic.com https://cdn.jsdelivr.net https://www.googletagmanager.com
  https://www.google-analytics.com https://generativelanguage.googleapis.com https://api.groq.com
  https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
      font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:;
      img-src 'self' data: blob: https:;
      connect-src 'self' https://www.googleapis.com https://identitytoolkit.googleapis.com
  https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com
  wss://*.firebaseio.com wss://firestore.googleapis.com https://www.google-analytics.com
  https://region1.google-analytics.com https://generativelanguage.googleapis.com https://api.groq.com
  https://openlibrary.org https://covers.openlibrary.org https://firebaselogging.googleapis.com
  https://firebaselogging-pa.googleapis.com;
      frame-src 'self' https://*.firebaseapp.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      upgrade-insecure-requests;
    ">

  Is the nonce a compile-time constant or generated per response?
  Compile-time constant. The value mylib2026static is a hardcoded literal in the static HTML (and repeated
  on every inline <script nonce="mylib2026static">); it is identical for every load.

  8. AI KEY HANDLING

  Where mylib_gemini_api_key is read:

  - L2646 — settings render: escapeHTML(sessionStorage.getItem('mylib_gemini_api_key') || '')
  - L9748 — getAIConfig(): (sessionStorage.getItem('mylib_gemini_api_key') || '')

  Where mylib_groq_api_key is read:

  - L2673 — settings render: escapeHTML(sessionStorage.getItem('mylib_groq_api_key') || '')
  - L9748 — getAIConfig(): (sessionStorage.getItem('mylib_groq_api_key') || '')

  (Both are written at L4633–4634 into sessionStorage.)

  Is either sent to a server you control, or only directly to Google/Groq?
  Only directly to the providers. No first-party/backend endpoint receives them.

  - Gemini: L9865 —
  https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}
  (direct to Google).
  - Groq: L9807 — fetch('https://api.groq.com/openai/v1/chat/completions', { headers: { Authorization:
  'Bearer ' + config.apiKey } }) (direct to Groq).




# 1. Critical: collaboration request can be self-accepted

### Severity: 🔴 Critical

This is the biggest issue I found that the CLI audit missed.

Your rules currently allow **either participant** in a collaboration request to change its status:

```text
allow update: if isSignedIn()
  && (request.auth.uid == resource.data.toUserId
      || request.auth.uid == resource.data.fromUserId)
  && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['status', 'updatedAt']);
```

There is **no state-transition restriction**.

That means:

1. Attacker A creates a request to B.
2. Request starts as `pending`.
3. A updates the request to:

   ```text
   status: "accepted"
   ```
4. A can then create the partnership because the partnership rule only checks that an accepted request exists.
5. The partnership becomes:

   ```text
   status: "accepted"
   ```
6. A can potentially read B's library.

Your JavaScript does check that the current user is the recipient before accepting, but **client-side checks are not security controls**. The Firestore rules must enforce this.

The application code demonstrates the intended flow: B should accept the request, after which the partnership is created. 

### Required fix

The rules need explicit transitions such as:

```text
pending -> accepted
pending -> rejected
pending -> cancelled
```

with:

* `toUserId` only → `accepted` / `rejected`
* `fromUserId` only → `cancelled`
* nobody → arbitrary status
* `accepted/rejected/cancelled` → no further status changes

This is a **must-fix before production**.

---

# 2. Critical: "Can add books" actually means "can edit/delete the owner's books"

### Severity: 🔴 Critical

This is confirmed in both the rules and the CLI audit.

Your helper is:

```text
function canEditLibrary(userId, libraryOwnerId) {
  return userId == libraryOwnerId || partnershipAllowsAdd(userId, libraryOwnerId);
}
```

And that helper is used for:

```text
books create
books update
books delete
```

So once the owner grants:

```text
allowAddBooks == true
```

the partner doesn't merely get permission to add a book.

They get permission to:

* modify existing books
* change metadata
* modify borrowing data
* modify highlights
* modify ownership-related fields subject to the update condition
* delete books

The CLI audit correctly noticed this. 

The UI itself describes the permission as **"Can add books"**, which makes the authorization considerably broader than the apparent product intention. 

### Why this matters

Suppose:

```text
Alice = library owner
Bob = collaborator
Alice grants Bob "Can add books"
```

Bob can potentially execute:

```js
db.collection("books").doc(aliceBook).update({
    title: "Attacker modified this"
});
```

or delete it.

### Required architecture

Separate these concepts:

```text
canAddToLibrary()
canEditOwnBook()
canEditPartnerBook()
canDeletePartnerBook()
canTransferBook()
```

If the intended permission is **"allow partner to add books to my library"**, then partner-created documents should be allowed, but existing owner documents should remain protected.

---

# 3. High: collaboration "unsubscribe" is only enforced for book reads

The CLI audit correctly identified this. 

Your book read rule checks:

```text
user1Unsubscribed
user2Unsubscribed
```

But `canEditLibrary()` does not.

Therefore:

```text
partner unsubscribes
        ↓
book reads stop
        ↓
but partner can potentially still write/delete
```

That's an authorization inconsistency.

The same problem exists for the activity feed:

```text
allow read ... partnership.status == 'accepted'
```

but it doesn't check the unsubscribe flag.

So "unfollow" isn't actually a security boundary.

### Required fix

Create a helper such as:

```text
function activePartnership(uid1, uid2) {
    ...
    && correct user's unsubscribed flag != true
}
```

Then consistently use it for:

* partner book reads
* partner book writes
* activity feed reads
* activity feed writes
* any other collaboration capability

---

# 4. High: either user can change the other's unsubscribe flag

Your partnership update rule permits:

```text
['allowAddBooks',
 'user1Unsubscribed',
 'user2Unsubscribed',
 'updatedAt',
 'grantedBy']
```

but does not establish:

```text
user1 can only modify user1Unsubscribed
user2 can only modify user2Unsubscribed
```

Therefore one participant can potentially manipulate the other participant's unsubscribe state.

The CLI audit noticed that the flags are included in `hasOnly()`, but didn't fully call out the integrity consequence. 

### Required fix

Use separate authorization branches:

```text
if auth.uid == userId1:
    only user1Unsubscribed may change

if auth.uid == userId2:
    only user2Unsubscribed may change
```

And preferably don't combine permission grants and unsubscribe state in one broad update rule.

---

# 5. High: book requests don't prove that the requested book belongs to the recipient

The CLI audit correctly identified this. 

Current create rule:

```text
allow create: if isSignedIn()
  && request.auth.uid == request.resource.data.fromUserId
  && request.resource.data.fromUserId != request.resource.data.toUserId
  && request.resource.data.status == 'pending';
```

There is **no relationship between**:

```text
bookId
toUserId
```

An attacker can manufacture:

```text
{
  fromUserId: attacker,
  toUserId: victim,
  bookId: arbitraryBookId,
  bookTitle: arbitraryTitle,
  phoneNumber: arbitraryPhone,
  address: arbitraryAddress,
  status: "pending"
}
```

This means the request system isn't cryptographically tied to the actual book.

### Why this matters

It enables:

* fake borrowing requests
* spam
* fake book metadata
* misleading notifications
* potentially malicious data displayed to users

### Required rule

The create operation should verify something equivalent to:

```text
get(/books/bookId).data.userId == toUserId
```

and ideally:

```text
book exists
book.owner == recipient
book isn't already borrowed
```

The server-side rule should be authoritative.

---

# 6. High: book updates have insufficient field-level authorization

This is related to finding #2 but deserves its own fix.

The rules validate:

```text
title
author
description
isbn
coverUrl
tags
categories
copyType
```

but don't restrict which fields an authorized partner may modify.

So if a partner passes `canEditLibrary()`, they can potentially modify unrelated fields.

For production, use:

```text
request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])
```

for each authorization role.

For example:

### Owner

Could modify:

```text
title
author
description
isbn
coverUrl
tags
categories
copyType
price
purchaseDate
...
```

### Partner with "add"

Could create:

```text
new book with userId = owner
```

but **not modify existing owner books**.

---

# 7. High: review counters can be forged

The CLI audit correctly found this. 

The rule permits any authenticated user to do:

```text
likesCount + 1
likesCount - 1
commentsCount + 1
commentsCount - 1
```

without proving that the corresponding like/comment operation happened.

Your frontend does create/delete the corresponding like document, but Firestore does not enforce the relationship. 

Therefore an attacker can repeatedly manipulate counters directly.

The current rule prevents:

```text
likesCount = 999999
```

in one write, but not:

```text
+1
+1
+1
+1
+1
...
```

### Correct production solution

Don't allow users to directly modify aggregate counters.

Use:

```text
/reviews/{reviewId}/likes/{uid}
```

as the source of truth.

Then either:

* Cloud Function updates the counter, or
* calculate counts from documents where practical.

Because you're staying on Firebase's free tier, I'd first investigate whether the counter can be maintained with a minimal architecture that stays within your limits rather than blindly introducing Functions everywhere.

---

# 8. High: review updates aren't fully validated

The create rule validates:

```text
category
body length
likesCount
commentsCount
```

But the owner update branch only checks:

```text
body
rating
category
updatedAt
```

It does **not revalidate**:

```text
body length
category
rating range
```

So an owner can bypass the create-time validation after publication.

For example, a review could be changed from:

```text
category = Review
```

to arbitrary values.

Or body size can exceed the create limit.

### Fix

Apply the same validation rules to update operations.

---

# 9. Medium/High: stored XSS risk in `index.html`

There is good escaping throughout the application. The `escapeHTML()` implementation is sound for HTML text/attribute contexts. The application also sanitizes AI output using DOMPurify. 

However, I found places where raw Firestore-controlled values are inserted into HTML.

For example:

```html
<option value="${author}">${author}</option>
```

The author comes from application data and isn't escaped at this location. 

There's also:

```html
${profile.displayName?.substring(0, 2) || '??'}
```

without escaping. 

And there are multiple dynamically constructed HTML blocks across the application.

### More concerning

I found an activity-feed path where a `bookId` is placed into an inline handler:

```html
onclick="window.jumpToBook('${a.bookId}')"
```

A Firestore document ID is attacker-controlled if somebody writes directly to Firestore using the public Firebase client API.

That is an unsafe sink.

### Production recommendation

Eliminate:

```html
onclick="..."
```

entirely.

Use:

```html
data-action="jump-to-book"
data-value="..."
```

and your existing centralized event delegation.

You already have that event-delegation architecture, so this is a relatively safe improvement without changing functionality. 

---

# 10. High: the CSP nonce is not actually a secure nonce

The CLI audit is correct here. 

You have:

```text
nonce-mylib2026static
```

and every response uses the same value.

A CSP nonce must be:

* unpredictable
* generated per response
* unavailable to an attacker

A static nonce is effectively a shared password embedded in public HTML.

### Important nuance

This doesn't automatically mean your app is exploitable.

But it means:

> **You cannot rely on this nonce as a meaningful XSS mitigation.**

### Better solution

Because you're on Vercel and using static HTML, the best architecture is:

1. externalize the large inline scripts
2. remove inline JavaScript
3. remove the nonce requirement
4. use a strict CSP with:

   ```text
   script-src 'self'
   ```

That is substantially cleaner.

---

# 11. High: excessive third-party JavaScript supply-chain exposure

The CLI audit correctly identified that external scripts have no SRI. 

Current external JavaScript includes:

* DOMPurify
* Google Tag Manager
* Tailwind CDN
* html5-qrcode
* Firebase
* PapaParse
* canvas-confetti
* Chart.js

Some are version-pinned, but several are not.

For example:

```html
https://cdn.tailwindcss.com
```

and:

```html
https://cdn.jsdelivr.net/npm/chart.js
```

are particularly undesirable for a production security posture.

### Recommended production architecture

Bundle dependencies during build:

```text
npm
  ↓
Vite / build
  ↓
static assets
  ↓
Vercel
```

Then:

```text
script-src 'self'
style-src 'self'
```

becomes possible.

This would dramatically reduce your supply-chain attack surface.

---

# 12. Medium: CSP is too permissive

Your CSP currently permits many domains:

```text
cdnjs.cloudflare.com
unpkg.com
gstatic.com
jsdelivr.net
googletagmanager.com
google-analytics.com
generativelanguage.googleapis.com
api.groq.com
apis.google.com
...
```

and:

```text
style-src ... 'unsafe-inline'
```

and:

```text
img-src ... https:
```

The CSP configuration is visible directly in the HTML. 

The broad `https:` image policy isn't automatically dangerous, but it's much broader than necessary.

Once dependencies are bundled, the CSP should be considerably tighter.

---

# 13. Medium: AI API keys are exposed to the browser

The CLI audit correctly found this. 

The application stores the user-supplied AI keys in:

```text
sessionStorage
```

and sends them directly from the browser to:

* Gemini
* Groq

The implementation confirms this. 

### Important distinction

These are **user-provided API keys**, not your server secret.

So this is not necessarily a vulnerability if the product intentionally follows:

> "Bring your own AI key."

But it means:

* XSS can steal the user's AI key.
* Browser extensions can potentially access it.
* Compromised third-party JavaScript can access it.
* The provider sees requests coming from the user's browser.
* You can't centrally enforce rate limits.

### One correction to the UI

The UI says:

> "Stored only in your browser's localStorage"

but the code actually uses `sessionStorage`.

That's a documentation bug, not a security control. 

---

# 14. Medium: Firebase API key in HTML is NOT itself a secret leak

The HTML contains:

```text
apiKey: "AIza..."
```

at the Firebase initialization. 

This is normal for Firebase web applications.

**Do not treat this as a leaked secret simply because it appears in `index.html`.**

The security boundary is:

```text
Firebase Authentication
+
Firestore Security Rules
+
Firebase API-key restrictions
```

not hiding the Firebase web API key.

You should nevertheless configure appropriate API-key restrictions and authorized domains, especially when moving to your custom subdomain.

---

# 15. Medium: all authenticated users can read all public user profiles

Your rules say:

```text
match /users/{userId} {
    allow read: if isSignedIn();
}
```

So any authenticated user can read every public profile document.

This appears intentional because the app has:

* user search
* collaboration
* profiles
* social features

So I would classify this as **privacy/design exposure**, not necessarily a vulnerability.

The important thing is to ensure the parent document never contains:

```text
email
phone
address
private notes
AI data
```

Your separation of:

```text
/users/{uid}
/users/{uid}/private/data
```

is a good design. The private subcollection is owner-only.

---

# 16. Medium: userLookup allows authenticated email enumeration

You have:

```text
match /userLookup/{email} {
    allow read: if isSignedIn();
}
```

The purpose is collaborator lookup.

That means an authenticated user can query whether particular email addresses exist.

Again, this may be intentional, but it has privacy implications.

The rule correctly prevents arbitrary email squatting by requiring the authenticated user's verified email to match the document. That's a good protection. 

---

# 17. Medium: readingStatus wildcard is broader than necessary

You have:

```text
match /{path=**}/readingStatus/{statusId}
```

This is extremely broad.

It effectively says:

> Any document anywhere in the database containing a `readingStatus` subcollection can be written if the status ID and user ID match.

It doesn't establish that the parent is actually:

```text
/books/{bookId}
```

So a user can potentially create:

```text
/randomCollection/randomDocument/readingStatus/{uid}
```

with valid-looking data.

This isn't an immediate cross-user data breach because the user ID is still enforced, but it unnecessarily expands the rules' attack surface.

### Better

Use:

```text
match /books/{bookId}/readingStatus/{statusId}
```

and validate:

```text
statusId == request.auth.uid
```

This is also much easier to reason about.

---

# 18. Important functional/security issue: readingStatus delete

The application performs deletes such as:

```js
batch.delete(
    db.collection('books')
      .doc(id)
      .collection('readingStatus')
      .doc(currentUser.uid)
);
```

But the rules use:

```text
allow write:
    ...
    && request.resource.data.userId == request.auth.uid
```

For a delete, `request.resource` does not represent the future document in the same way as an update/create.

So the delete path deserves explicit testing.

I would change this into separate:

```text
allow create
allow update
allow delete
```

rules rather than using a broad `allow write`.

That will also make the authorization much easier to audit.

---

# 19. Book ownership transfer deserves redesign

The CLI audit noticed this behavior. 

Current logic:

```text
resource.data.userId == request.auth.uid
&& canEditLibrary(
    request.auth.uid,
    request.resource.data.userId
)
```

This means the owner can transfer the book to a user who has granted the owner permission to edit their library.

That may be intentional, but the authorization model is backwards/confusing.

I'd strongly recommend an explicit transfer rule:

```text
current owner
    +
recipient explicitly accepts
    ↓
ownership transfer
```

rather than tying transfer to `canEditLibrary()`.

---

# 20. Race conditions in borrowing

The JavaScript does:

```text
read book
↓
check borrowedBy
↓
update book
```

Two users could potentially do this concurrently.

Firestore rules currently don't enforce:

```text
book.borrowedBy must still be empty
```

during the update.

So the system needs an atomic state transition.

For example:

```text
update only if
resource.data.borrowedBy == null
request.resource.data.borrowedBy != null
```

or use a transaction with appropriate rules.

This is an integrity issue rather than a classic data-exfiltration vulnerability.

---

# CLI audit: what it got right

The CLI audit was correct on several important points:

| Finding                                 | CLI audit | My verification |
| --------------------------------------- | --------: | --------------: |
| Partner permission model                |         ✅ |       Confirmed |
| Partner can edit/delete books           |         ✅ |       Confirmed |
| Unsubscribe inconsistencies             |         ✅ |       Confirmed |
| Book request doesn't validate ownership |         ✅ |       Confirmed |
| Review counter manipulation             |         ✅ |       Confirmed |
| CDN/SRI issue                           |         ✅ |       Confirmed |
| Static CSP nonce                        |         ✅ |       Confirmed |
| AI keys in sessionStorage               |         ✅ |       Confirmed |

Its discussion of the partnership permission implementation and missing `grantedBy` frontend writes is accurate. 

---

# What the CLI audit missed

These are the most important additions:

### 🔴 Critical

1. **Collaboration request can be self-accepted**
2. **Self-accepted collaboration can create an accepted partnership**
3. **Accepted partnership can expose another user's library**

### 🔴 High

4. "Can add books" grants broad edit/delete capability.
5. Partner can modify fields beyond "add".
6. Unsubscribe does not revoke write capability.
7. One partner can manipulate the other partner's unsubscribe state.
8. Book request isn't cryptographically tied to the recipient's book.
9. Review updates lack equivalent validation.
10. Stored HTML/inline-handler injection surfaces exist.
11. `readingStatus` wildcard is overly broad.
12. Borrowing has a race/integrity problem.

### 🟠 Medium

13. User email enumeration.
14. Broad public profile visibility.
15. Overly broad CSP.
16. Multiple external JavaScript supply-chain dependencies.
17. Firebase web API key should be properly restricted.
18. `readingStatus` should have explicit create/update/delete rules.

---

# Current risk picture

If I were doing the production gate, I'd classify the application approximately like this:

| Area                                | Status                                       |
| ----------------------------------- | -------------------------------------------- |
| Authentication requirement          | 🟢 Good                                      |
| Private user data                   | 🟢 Good                                      |
| Firebase API key exposure           | 🟢 Normal Firebase behavior                  |
| UserLookup ownership                | 🟢 Good                                      |
| Collaboration request authorization | 🔴 **Fix**                                   |
| Partnership authorization           | 🔴 **Fix**                                   |
| Partner book permissions            | 🔴 **Fix**                                   |
| Book ownership transfer             | 🟠 Redesign                                  |
| Book request integrity              | 🔴 **Fix**                                   |
| Borrowing race conditions           | 🟠 Fix                                       |
| Review counters                     | 🟠 Fix                                       |
| Review validation                   | 🟠 Fix                                       |
| Reading-status rules                | 🟠 Fix                                       |
| XSS protection                      | 🟠 Needs hardening                           |
| CSP                                 | 🟠 Weak                                      |
| Third-party JS supply chain         | 🟠 Weak                                      |
| AI user-key handling                | 🟠 Acceptable BYOK model, but exposed to XSS |
| Overall production readiness        | 🔴 **Not yet**                               |

---

## The most important fix order

I would **not** start by changing the CSP or adding SRI. Those are important, but they aren't the biggest immediate risk.

I would fix in this order:

```text
1. Collaboration request state machine
       ↓
2. Partnership creation authorization
       ↓
3. Separate "add" from "edit/delete"
       ↓
4. Enforce unsubscribe consistently
       ↓
5. Lock down book-request ownership
       ↓
6. Lock down book update fields
       ↓
7. Fix review counters + validation
       ↓
8. Fix unsafe HTML/onclick sinks
       ↓
9. Narrow readingStatus rules
       ↓
10. Fix borrowing atomicity
       ↓
11. Remove static CSP nonce
       ↓
12. Bundle/pin third-party JS
       ↓
13. Tighten CSP
       ↓
14. Restrict Firebase API keys / custom domain
```
