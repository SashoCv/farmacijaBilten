# Implementation plan: editorial back-office for the Macedonian Pharmaceutical Bulletin

Accounts and roles, the in-app manuscript template, peer review, payments and track changes.
Project: `/Users/sasho/Sites/bilten_farmacija` (Laravel 13, Fortify, Inertia 3, React 19, TypeScript, Tailwind 4, SQLite now; PHP 8.3 syntax only).

---

## 1. Summary

1. **One account can hold several roles**: `admin` (shown as "Editorial office"), `author` and `reviewer`. Authors register themselves. Reviewers join only through an e-mailed invitation link. Admins come from the console or are promoted by another admin. Admins must use 2FA or a passkey.
2. **Authors write the paper in the app on a fixed template.**
    - Structured front matter: type, title, authors, affiliations, abstract, keywords and the summary in the other language.
    - One constrained TipTap v3 editor per section, built from MIT packages only.
    - Tables follow the booktabs style. Figures, structured Harvard references and the Macedonian/English summary are part of the template.
3. **There is one source of truth.** The JSON is rendered by a single PHP renderer to HTML. That HTML feeds the preview, the reviewer view, the diff input and a one-column PDF made with WeasyPrint.
4. **Workflow:** 10 statuses in a PHP enum. Every change goes through one `ManuscriptWorkflow` service and writes an append-only event in the same transaction. No controller writes `status`.
5. **Peer review:**
    - Invitations use a hashed single-use token inside a signed link.
    - Reviewers declare competing interests, then submit a recommendation, comments to the author, a confidential note to the editor and files with a visibility setting.
    - Reviewers and the editor talk in a message thread. Deadlines and reminders run automatically.
6. **Track changes** has four parts: the event timeline for every status, frozen immutable versions, a block-level diff with word-level detail, and a response letter that is required on resubmission.
7. **The admin sees everything**, filters it, invites reviewers, writes decision letters and records payment (paid / unpaid / waived, amount, date, reference) per paper. There is also a per-author view.
8. **Anonymity, file access and fees are configurable.** Files are private and checked by policy on every download. Anonymity is single or double, defaulting to double until the editors confirm. No journal fact is hard-coded: anything not yet confirmed is marked `TO CONFIRM` in config.
9. **The review workflow ships before the editor.** Release 2 lets authors upload the body as a file, so the editorial office can start using the system after about 4 weeks. The template editor follows in release 3.
10. **About 12–14 developer-weeks in 6 releases.** Each release ends in a demo. The two risky parts (editor tables and PDF fidelity) are spiked in week 1.

---

## 2. Decisions and rationale

Where the three source plans disagreed, the choice and the reason are given.

| #   | Decision                                                                                                                                                                                                                                                                | Rationale and conflicts resolved                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Multiple roles per user** in a `user_roles` table, with the enum `App\Enums\Role`. No spatie/permission.                                                                                                                                                              | In a faculty journal the same professor is often both author and reviewer, and e-mail is unique. Three roles do not justify a package.                                                                                                                                                                                                                                                                                                                                  |
| D2  | **Registration creates authors only.** Reviewers join by invitation. Admins come from `journal:editor` or a promotion. Every verified account can become an author: a reviewer-only user who clicks "New manuscript" is granted the author role after one confirmation. | This keeps privilege escalation off the public surface without blocking anyone from submitting.                                                                                                                                                                                                                                                                                                                                                                         |
| D3  | **A new `manuscripts` domain.** The existing `submissions` table becomes a read-only "Legacy submissions" inbox with an **Import as manuscript** action.                                                                                                                | The legacy model is one uploaded file with denormalised author data. Reusing it would mix two status sets and break 18 `SubmissionTest` tests for no gain.                                                                                                                                                                                                                                                                                                              |
| D4  | **Ship the workflow before the editor.** A version has `source = upload \| editor`. Release 2 uses upload, which also covers imported legacy papers. Release 3 makes the editor the default and upload becomes admin-only.                                              | Taken from plan 3. The editorial office gets a working system weeks earlier, and the risk in the editor does not hold it back.                                                                                                                                                                                                                                                                                                                                          |
| D5  | **One TipTap editor per section**, all inside a single page that looks like the printed article. Front matter is edited in structured fields styled like page 1. Table, figure and equation numbering is computed across all sections.                                  | Plans 1 and 2 used one editor with a `section+` schema. Plan 3 used one editor per section. **Per-section won**: fixed headings become plain UI, with no ProseMirror `filterTransaction` tricks to stop authors deleting "Introduction". Transactions stay small, validation and diff map one-to-one onto sections, and a broken section cannot corrupt the whole paper. The printed-page look from plan 2 is kept, so the author still feels they are writing a paper. |
| D6  | **The working copy and the frozen versions are kept apart.** `manuscript_drafts` holds one row per manuscript. `manuscript_versions` rows are immutable.                                                                                                                | Plan 1 used a separate table. Plans 2 and 3 used a JSON column on `manuscripts`. **The separate table won** because list queries and `SELECT *` never load megabytes of JSON.                                                                                                                                                                                                                                                                                           |
| D7  | **Submission-only data is stored apart from the content** (`submission_data` JSON for declarations, suggested and opposed referees, cover letter and APC acknowledgement). The renderer never receives it.                                                              | Anonymity is guaranteed by structure, not by remembering to filter.                                                                                                                                                                                                                                                                                                                                                                                                     |
| D8  | **One PHP renderer**, `App\Manuscripts\Rendering\ManuscriptRenderer`, turns JSON into HTML for every consumer. Text is escaped, nodes and attributes come from an allowlist, and `symfony/html-sanitizer` runs as a second layer.                                       | Nothing runs JavaScript on the server, so there is no TipTap-on-Node dependency. The output is deterministic and tested against golden files.                                                                                                                                                                                                                                                                                                                           |
| D9  | **PDF: the WeasyPrint CLI (pinned ≥ 69) through Symfony Process, in a queued job, behind a `PdfEngine` interface.** The browser "Print / Save as PDF" from the same print CSS is the interim option and the fallback. A spike in week 1 decides.                        | WeasyPrint has the best paged-media support: `@page :first/:left/:right`, `string-set`, page-counter offset and footnotes. Calling the CLI directly avoids an unverified package driver. Chromium with Paged.js remains the fallback.                                                                                                                                                                                                                                   |
| D10 | **Equations: LaTeX is rendered to SVG on the server** (Node `mathjax-full` script, run at preview and freeze time), sanitised and cached. KaTeX is used only for the live editor preview.                                                                               | Plan 2 stored client-generated SVG. That makes the SVG untrusted input, so server-side rendering won. Equations are rare, so they come late in the plan.                                                                                                                                                                                                                                                                                                                |
| D11 | **Payment is a set of fields plus events, never a workflow status.**                                                                                                                                                                                                    | The owner wants paid/unpaid independent of the editorial decision. The fee itself is TO CONFIRM.                                                                                                                                                                                                                                                                                                                                                                        |
| D12 | **Anonymity is configurable: `journal.review.anonymity = double_anonymous \| single_anonymous`, defaulting to `double_anonymous`.** Reviewers are never shown to authors.                                                                                               | The site and DOAJ disagree, so the default is the safest option until the editors confirm.                                                                                                                                                                                                                                                                                                                                                                              |
| D13 | **Template facts live in a new `config/manuscript.php`**: types, skeletons, limits, printed labels in EN and MK, and PDF geometry. Policy and workflow knobs live in `config/journal.php`. Everything unconfirmed is marked `TO CONFIRM`.                               | Never invent journal facts.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D14 | **The back-office is light-only and uses the journal palette** (the `journalTokens` approach from AuthLayout).                                                                                                                                                          | The manuscript canvas is "paper" anyway, the admin page already forces white, and there is one theme to test.                                                                                                                                                                                                                                                                                                                                                           |
| D15 | **Append-only is enforced twice**: model guards, plus SQLite `BEFORE UPDATE/DELETE` triggers on events, versions and decisions.                                                                                                                                         | Plan 1's defence in depth. It is cheap and makes the audit trail credible.                                                                                                                                                                                                                                                                                                                                                                                              |
| D16 | **Word-style suggestion mode is out of scope.** Comments anchored to text in frozen versions are a later option.                                                                                                                                                        | This is what editors actually need. TipTap's suggestion and compare features are paid packages.                                                                                                                                                                                                                                                                                                                                                                         |

---

## 3. Roles and accounts

### 3.1 Role model

- **`app/Enums/Role.php`**: the cases are `Admin='admin'`, `Author='author'` and `Reviewer='reviewer'`. `label()` returns the English key: "Editorial office" / "Author" / "Reviewer".
- **Methods on `User`**:
    - `roles(): HasMany<UserRole>`, `hasRole(Role)`, `grantRole(Role, ?User $by)` and `revokeRole(Role, User $by)`.
    - Granting and revoking are idempotent and each one writes a `user_events` row.
    - Scopes: `withRole()` and `active()`.
- **Middleware**:
    - `app/Http/Middleware/EnsureUserHasRole.php`, aliased as `role` in `bootstrap/app.php` (for example `role:admin`). It aborts with 403, which renders the branded `ErrorPage`, and it also rejects deactivated users.
    - `EnsureAdminTwoFactor`, used on the admin group and switched by `journal.security.admin_requires_2fa` (default `true`). An admin with neither `two_factor_confirmed_at` nor a passkey is redirected to `settings/security` with a toast.
- **Policies make the fine-grained decisions** (§12). The middleware is only a coarse gate.
- **Data migration**: every existing user is granted `admin`, because today only editors have accounts.

### 3.2 Registration (authors)

- **`config/fortify.php`**: enable `Features::registration()` and set `'home' => '/dashboard'`.
- **`app/Actions/Fortify/CreateNewUser.php`**:
    - Validates:
        - `given_name`, `family_name`, an optional `academic_title` (Prof. / Assoc. Prof. / Asst. Prof. / Dr / MSc / MPharm)
        - `email` (lower-cased) and `password`
        - `affiliation` and `department`, `city`, `country_code` (ISO select)
        - optional `phone`
        - optional `orcid` (regex `^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$` plus the ISO 7064 checksum, as a rule in `app/Rules/Orcid.php`)
        - `locale` (`en` / `mk`, defaulting to the current UI locale)
        - `privacy_accepted`, which is required and stored as `privacy_accepted_at`
        - the honeypot field `website`, as in `SubmissionController`
    - Inside a transaction it creates the user and grants `Role::Author`. `name` stays as the display name and is kept in sync as "given family" by a `saving` hook.
- **Throttling**: Fortify has no limiter for registration, so `app/Http/Middleware/ThrottleRegistration.php` applies `RateLimiter::attempt('register:'.$ip, 5, …, 3600)` only when `routeIs('register.store')`.
- **Email verification** stays on. Every back-office route uses `verified`.
- **Password policy**: keep the production `Password::defaults()`. Plan 2 suggested relaxing `mixedCase` and `symbols`; that is open question Q19. Test that `uncompromised()` fails open when HaveIBeenPwned is unreachable (`Http::fake` throwing). DEPLOY.md must note outbound HTTPS to `api.pwnedpasswords.com`.
- **New page `resources/js/pages/auth/register.tsx`**:
    - One column with three short groups: Name, Institution, Sign-in.
    - "Why we ask" next to ORCID, and a link to the Instructions for Authors.
    - Reuses `Form`, `Input`, `PasswordInput`, `InputError`, plus `ErrorSummary` and `FieldError` extracted from `components/journal/submission-form.tsx` into `components/forms/`.
- **Copy changes**:
    - `login.tsx` gets the description "Sign in to the Bulletin's manuscript system" and a "Create an author account" link.
    - `auth-layout.tsx` gets the eyebrow "Manuscript system" and the footnote "Authors create an account to submit. Reviewers join by invitation from the editorial office." The Nexsol Labs credit stays.
    - `forgot-password.tsx` and `reset-password.tsx` drop the words "editor account".

### 3.3 Reviewer invitations

The full flow is in §8.1. In short:

- The admin types one or more e-mails.
- A `review_assignments` row stores `token_hash = sha256(Str::random(48))`.
- The e-mail carries `URL::temporarySignedRoute('invitations.show', $expires, ['assignment' => public_id, 'token' => $plain])`.
- **The `signed` middleware makes `StatelessPublicRequests` start a real session**, so the form POSTs have a CSRF token and no 419 occurs. A test asserts this.
- The hashed token makes the link single-use and revocable. Resending rotates the token.

How acceptance resolves the account:

| Situation                         | Result                                                                                                                                                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed in with the same e-mail    | Link the user and grant the reviewer role.                                                                                                                                                                                                                                              |
| Signed in with a different e-mail | A warning: "This invitation was sent to x@…". The choices are **Sign out and continue** or **Accept with my current account**. The second records both addresses in an event and notifies the admin. Professors often have two addresses.                                               |
| Not signed in, an account exists  | Store `invitation.pending = {assignment, token}` in the session and send the user to login with the e-mail pre-filled. A `Login` event listener finishes the acceptance and redirects to the review (`intended`).                                                                       |
| Not signed in, no account         | Show a "Create your reviewer account" step on the same page: given and family name, affiliation, country and password. The user is created with `email_verified_at = now()` (the link proves ownership) and the reviewer role, then logged in, and `session()->regenerate()` is called. |

An existing user who is invited gets the reviewer role added and never a duplicate account. After acceptance, every later e-mail links to authenticated pages only.

### 3.4 E-mailed sign-in link (optional, release 5)

This is for reviewers who come twice a year.

- `POST login/link` (`guest`, 3 per 10 minutes per e-mail and IP) always answers "If an account exists, we sent a link".
- The link is a 15-minute signed `GET login/link/{user}` with a single-use nonce kept in cache.
- Users with 2FA are routed through Fortify's challenge by setting `login.id`.
- Admins are excluded (`journal.security.login_links_for_admins = false`).
- It is off by default (`journal.security.login_links`) until the owner approves it.

### 3.5 Admins

- **One command**: `journal:editor {email} {--name=}` in `routes/console.php`, the one documented in DEPLOY.md §3.6 and tested by PlatformTest. It creates the user or promotes an existing one, and grants `Role::Admin` through `App\Actions\Users\MakeAdmin`.
- **Delete `app/Console/Commands/CreateEditor.php`** (the duplicate) and update DEPLOY.md.
- **`/admin/users`** grants and revokes roles behind `password.confirm`. An admin cannot revoke their own admin role, and the last admin cannot be revoked.

### 3.6 Profile, deactivation and deletion

- **Settings → Profile** gets the new fields plus optional "Expertise keywords", which help when choosing reviewers. `ProfileUpdateRequest` is extended to match.
- **`ProfileController::destroy`**: a user with any manuscript, assignment, message or event is refused with "Contact the editorial office to close your account". Users with no history can still delete their account.
- **Deactivation**: an admin sets `users.deactivated_at`. `FortifyServiceProvider::authenticateUsing` and the role middleware reject deactivated users.
- **Every foreign key from editorial tables to `users` uses `restrictOnDelete`.**
- **Explicit `auth.user` share**: `HandleInertiaRequests` stops serialising the whole model. It sends `{id, name, email, email_verified, avatar, locale, roles[], has_two_factor, has_passkeys}` and `resources/js/types/auth.ts` is updated. `phone` is also added to `#[Hidden]`.
- **`User implements HasLocalePreference`**, so `preferredLocale()` returns `locale` and queued mail is sent in the right language.

### 3.7 Landing

`/dashboard` (`DashboardController` → `pages/dashboard.tsx`) shows one "My tasks" card group for each role the user holds:

- **Admin**: new submissions to check, reviews complete and awaiting a decision, overdue reviews and invitations, revisions received, accepted but unpaid, unread messages, and a mail-queue health line.
- **Reviewer**: pending invitations and reviews due or overdue.
- **Author**: drafts, revisions due and recent decisions.

---

## 4. Statuses and transitions

### 4.1 Manuscript status

`app/Enums/ManuscriptStatus.php` has the cases `Draft`, `Submitted`, `UnderReview`, `RevisionRequested`, `Resubmitted`, `Accepted`, `InProduction`, `Published`, `Rejected` and `Withdrawn`. It provides `label()`, `authorLabel()` (plain language, for example "With reviewers"), `tone()` and `isTerminal()`.

The type of revision (`technical | minor | major`) is stored in `manuscripts.revision_kind`. It is not a separate status.

| From                      | Action                              | To                                                                        | Who                    | Guards and side effects                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| draft                     | `submit`                            | submitted                                                                 | submitter              | Verified e-mail. `ManuscriptChecker` reports no errors. All declarations ticked. Freeze **v1** (round 1). Assign `reference` (`MPB-YYYY-NNNN`) and `received_at`. Rebuild `manuscript_contributors`. Queue PDFs. Notify the admins and send the submitter a receipt.                                                                                                                                 |
| draft                     | `discard`                           | (row deleted)                                                             | submitter              | Only if `reference IS NULL`, i.e. never submitted.                                                                                                                                                                                                                                                                                                                                                   |
| submitted                 | `send_to_review`                    | under_review                                                              | admin                  | Happens automatically on the round's first invitation, or explicitly. Needs at least one assignment.                                                                                                                                                                                                                                                                                                 |
| submitted                 | `return_technical`                  | revision_requested (`technical`)                                          | admin                  | Letter required. `revision_due_at` = now + `journal.workflow.revision_days` (30, from the IFA).                                                                                                                                                                                                                                                                                                      |
| submitted                 | `desk_reject`                       | rejected                                                                  | admin                  | Letter required.                                                                                                                                                                                                                                                                                                                                                                                     |
| submitted                 | `accept` (without review)           | accepted                                                                  | admin                  | Extra confirmation and a mandatory `override_reason`.                                                                                                                                                                                                                                                                                                                                                |
| under_review, resubmitted | `request_revision` (minor or major) | revision_requested                                                        | admin, not a COI admin | Letter pre-filled with each "Reviewer N" comment to the author, never the confidential ones. Sets `revision_due_at`.                                                                                                                                                                                                                                                                                 |
| under_review, resubmitted | `accept`                            | accepted                                                                  | admin, not a COI admin | At least one submitted review in the round (or the previous round when resubmitted), otherwise `override_reason`. Letter. `accepted_at`. **APC snapshot**: `payment_status = unpaid` with amount and currency from `config('journal.apc')` when enabled, otherwise `not_required`. Outstanding assignments are cancelled, each with an event and a polite e-mail. Queue the accepted-manuscript PDF. |
| under_review, resubmitted | `reject`                            | rejected                                                                  | admin, not a COI admin | Letter. Open assignments cancelled.                                                                                                                                                                                                                                                                                                                                                                  |
| revision_requested        | `resubmit`                          | resubmitted                                                               | submitter              | Checker passes. **Response to reviewers is required** unless the revision was `technical`. Freeze v(n+1).                                                                                                                                                                                                                                                                                            |
| resubmitted               | `send_to_review`                    | under_review                                                              | admin                  | `current_round++`. A one-click preset re-invites the previous reviewers, who keep their "Reviewer N" number.                                                                                                                                                                                                                                                                                         |
| accepted                  | `start_production`                  | in_production                                                             | admin                  | Blocked unless `paid` or `waived` when `journal.apc.required_before_production` is set (default `false`, TO CONFIRM).                                                                                                                                                                                                                                                                                |
| in_production             | `publish`                           | published                                                                 | admin                  | Volume, issue, pages and DOI are set. The `Article` row is created or linked. Optional gate `journal.apc.required_before_publication`.                                                                                                                                                                                                                                                               |
| submitted … in_production | `withdraw`                          | withdrawn                                                                 | admin                  | The author uses `request_withdrawal`, which writes an event, posts a message and sets `withdrawal_requested_at` without changing the status. The admin confirms. Assignments are cancelled.                                                                                                                                                                                                          |
| rejected, withdrawn       | `reopen`                            | the status before the terminal one (from the last `status_changed` event) | admin                  | `password.confirm` and a reason are required (appeals, COPE).                                                                                                                                                                                                                                                                                                                                        |

Admin edits to content after acceptance (copyediting) create a new version of kind `production`. They never change an existing version.

### 4.2 Review assignment sub-machine

`AssignmentStatus` has these transitions:

- `invited → accepted | declined | expired`. The scheduler sets `expired` after `response_due_at` plus `grace_days`.
- `accepted → submitted`
- any non-terminal status → `cancelled` (by the admin, by the reviewer choosing "can't complete", or automatically after a decision)
- `submitted → accepted` when an admin unlocks the review. This is logged.

### 4.3 Reviewer recommendation versus editor decision

- **`Recommendation`**: `accept`, `minor_revision`, `major_revision` or `reject`. The owner's words map as: "accepted" is `accept`, "returned for revision" is `minor_revision` or `major_revision`, and "declined" is `reject`. Labels and the set itself live in `config('journal.review.recommendations')` (Q8). A recommendation is advice. The form says plainly: "The editor makes the final decision."
- **`DecisionType`**: `send_to_review`, `return_technical`, `desk_reject`, `accept`, `minor_revision`, `major_revision`, `reject` or `reopen`.

### 4.4 Implementation

- `app/Manuscripts/Workflow/ManuscriptWorkflow.php` runs `transition(Manuscript $m, Action $a, User $actor, array $payload = []): Manuscript` in these steps:
    1. `Gate::forUser($actor)->authorize($a->ability(), $m)`.
    2. `$to = $m->status->target($a)`. If there is no target it throws `InvalidTransition` (HTTP 422).
    3. Run the guard classes in `app/Manuscripts/Workflow/Guards/*`.
    4. In `DB::transaction`, do a compare-and-set update: `Manuscript::whereKey($id)->where('status', $from)->update([...])`. If no row was affected it throws `ConcurrentTransition` (HTTP 409, "Someone else just changed this manuscript"). Versions, decisions and events are written in the same transaction.
    5. Notifications are sent with `ShouldQueueAfterCommit`. `queue.after_commit` is false, so this must be explicit.
- **Named entry points**: `submit`, `resubmit`, `inviteReviewers`, `respondToInvitation`, `submitReview`, `unlockReview`, `decide`, `requestWithdrawal`, `withdraw`, `reopen`, `startProduction`, `publish`.
- **Related services**: `ReviewWorkflow` for assignment changes and `PaymentService::record()` for payment. Neither changes the manuscript status.
- **Protection**: `status` is in `Manuscript::$guarded`. A test fails if `->status =` or `'status' =>` appears outside `app/Manuscripts/Workflow`.

---

## 5. Data model

All tables are new apart from the `users` changes. Migrations are dated `2026_11_10_*`. They must stay portable to MySQL and Postgres apart from the guarded triggers. Timestamps are stored in UTC and displayed in `Europe/Skopje`. Relations are typed for larastan level 7 (`@return BelongsTo<User, $this>`), with array shapes for the JSON value objects.

### 5.1 Users

**`users`** gets these new columns:

| Column                                                   | Type                    | Notes                                                  |
| -------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| `given_name`, `family_name`                              | string(120) null        | Backfilled from `name` by splitting on the last space. |
| `name_alt`                                               | string(255) null        | The name in the other script, for the Резиме.          |
| `academic_title`                                         | string(40) null         |                                                        |
| `affiliation`, `department`                              | string(500) null        |                                                        |
| `address`, `postal_code`, `city`                         | string null             |                                                        |
| `country_code`                                           | char(2) null            |                                                        |
| `phone`                                                  | string(40) null         | Hidden.                                                |
| `orcid`                                                  | string(19) null, unique |                                                        |
| `expertise`                                              | json null               |                                                        |
| `locale`                                                 | char(2), default `mk`   |                                                        |
| `privacy_accepted_at`, `deactivated_at`, `last_login_at` | timestamp null          |                                                        |

**`user_roles`**: `id`, `user_id` (FK, cascadeOnDelete, since this is the user's own data), `role` string(20), `granted_by` (FK users, null, nullOnDelete) and `created_at`. Unique on (`user_id`, `role`); index on `role`.

**`user_events`** is append-only: `id`, `user_id`, `actor_id` null, `type` (`role_granted | role_revoked | deactivated | reactivated | email_changed`), `payload` json and `created_at`.

### 5.2 Manuscripts

**`manuscripts`**

| Column                                                                                                                   | Type                               | Notes                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `public_id`                                                                                                        | ulid, unique                       | `public_id` is the route key and prevents enumeration.                                                                                                                     |
| `reference`                                                                                                              | string(20) null, unique            | Assigned at the **first submit**. `App\Manuscripts\ReferenceNumber` computes max+1 per year across **both** `submissions` and `manuscripts` inside the submit transaction. |
| `submitter_id`                                                                                                           | FK users null, restrict            | Null only for legacy imports, enforced with a CHECK.                                                                                                                       |
| `type`                                                                                                                   | string(40)                         | Key from `config('manuscript.types')`.                                                                                                                                     |
| `language`                                                                                                               | char(2)                            | `en` or `mk`.                                                                                                                                                              |
| `status`                                                                                                                 | string(24), default `draft`        |                                                                                                                                                                            |
| `revision_kind`                                                                                                          | string(16) null                    | `technical`, `minor` or `major`.                                                                                                                                           |
| `current_round`                                                                                                          | unsignedTinyInteger, default 1     |                                                                                                                                                                            |
| `current_version_id`                                                                                                     | FK manuscript_versions null        |                                                                                                                                                                            |
| `handling_editor_id`                                                                                                     | FK users null                      | Optional choice among the admins.                                                                                                                                          |
| `title_plain`, `authors_plain`, `keywords_plain`                                                                         | text                               | Denormalised for lists, search and CSV.                                                                                                                                    |
| `status_changed_at`                                                                                                      | timestamp                          |                                                                                                                                                                            |
| `submitted_at` (first), `last_submitted_at`, `received_at`, `accepted_at`, `rejected_at`, `withdrawn_at`, `published_at` | timestamp null                     | `received_at` defaults to the first submit (Q20).                                                                                                                          |
| `revision_due_at`, `withdrawal_requested_at`                                                                             | timestamp null                     |                                                                                                                                                                            |
| `payment_status`                                                                                                         | string(16), default `not_required` | `not_required`, `unpaid`, `paid` or `waived`.                                                                                                                              |
| `apc_amount_minor` (unsigned int), `apc_currency` (char 3)                                                               | null                               | Snapshot taken at acceptance.                                                                                                                                              |
| `paid_at` (date), `payment_reference` (string 120), `payment_note` (text)                                                | null                               |                                                                                                                                                                            |
| `payment_marked_by` (FK users), `payment_marked_at`                                                                      | null                               |                                                                                                                                                                            |
| `volume`, `issue_number`, `first_page`, `last_page`                                                                      | smallint null                      | Set in production.                                                                                                                                                         |
| `doi`                                                                                                                    | string null, unique                | Suggested from the pattern `10.33320/maced.pharm.bull.{YYYY}.{VV}.{II}.{NNN}`.                                                                                             |
| `article_id`                                                                                                             | FK articles null, nullOnDelete     | Set when published.                                                                                                                                                        |
| `legacy_submission_id`                                                                                                   | FK submissions null, unique        |                                                                                                                                                                            |
| timestamps                                                                                                               |                                    |                                                                                                                                                                            |

Indexes: (`status`, `status_changed_at`), (`submitter_id`, `status`), (`payment_status`, `accepted_at`), (`type`), (`revision_due_at`) and (`submitted_at`). There are no soft deletes. Only drafts that were never submitted may be hard-deleted.

**`manuscript_drafts`** (1:1 with the manuscript; the working copy)

- `id`, `manuscript_id` (unique, cascadeOnDelete)
- `schema_version` smallint
- `content` json: the content document described in §6.1
- `submission_data` json: declarations, suggested and opposed referees, cover letter, APC acknowledgement and the "invited" flag. **The renderer never reads this column.**
- `response_to_reviewers` json null (limited rich text)
- `lock_version` unsigned int (optimistic concurrency)
- `updated_by`, `updated_at`

**`manuscript_versions`** (immutable)

- `id`, `manuscript_id` (restrictOnDelete)
- `number` smallint, `round` smallint
- `kind`: `submission`, `revision`, `production` or `legacy`
- `source`: `editor` or `upload`
- `schema_version`
- `content`, `submission_data`, `response_to_reviewers`: json
- `html` longText (full view), `html_anonymised` longText
- `blocks` json: `[{id, section, type, text, html}]`, precomputed for the diff
- `math` json: LaTeX hash to sanitised SVG
- `content_hash` char(64): sha256 of the canonical JSON
- `pdf_file_id`, `review_pdf_file_id`: null. These are the only columns that may be filled in after creation, through a dedicated method.
- `created_by`, `created_at`
- Unique on (`manuscript_id`, `number`).

**`manuscript_contributors`** is a projection of the current version's authors, rebuilt on every freeze. It serves search, the per-author view and conflict checks.

- Columns: `id`, `manuscript_id`, `position`, `given_name`, `family_name`, `email` (lower-cased, null), `orcid` null, `is_corresponding`, `affiliation_text`, and `user_id` null (matched by e-mail).
- Indexes: `email`, `user_id`, (`manuscript_id`, `position`).

**`manuscript_files`**

- `id`, `public_id` (ulid), `manuscript_id`
- `version_id` null, `review_assignment_id` null, `message_id` null
- `uploaded_by` FK users
- `kind`: `body_upload`, `figure`, `supplementary`, `cover_letter`, `response_letter`, `disclosure_form`, `ethics_form`, `review_attachment`, `decision_attachment`, `generated_pdf`, `proof` or `legacy_manuscript`
- `visibility`: `editors`, `editors_reviewers`, `editors_author` or `all_parties`, with defaults per kind
- `disk` (always `local`), `path` (`manuscripts/{id}/{kind}/{uuid}.{ext}`)
- `original_name`, `display_name` (anonymised, for example "Reviewer-2-attachment-1.pdf")
- `mime`, `size`, `sha256`, `width_px`, `height_px` (from `getimagesize`, which needs no gd)
- `deleted_at`, `deleted_by`: soft delete only; the file stays on disk for the audit
- `created_at`
- Index on (`manuscript_id`, `kind`).
- Files are never overwritten. A replacement is a new row, and figures referenced by a frozen version cannot be deleted.

### 5.3 Review

**`review_assignments`**

- `id`, `public_id` (ulid), `manuscript_id`, `round`, `version_id`
- `reviewer_id` (FK users null, restrict), `email`, `name` null
- `ordinal` tinyint: the stable "Reviewer N" per manuscript across rounds
- `invited_by`, `invitation_locale`, `invitation_message` (the text actually sent)
- `status`
- `token_hash` char(64) null unique, `token_expires_at`
- `invited_at`, `responded_at`, `response_due_at`, `review_due_at`, `completed_at`
- `decline_reason`, `suggested_alternative`
- `coi_none` (bool null), `coi_statement` (text null), `confidentiality_accepted_at`
- `accepted_with_email` (when the reviewer accepted under another account)
- `reminders_sent` tinyint, `last_reminded_at`
- `cancelled_reason`
- timestamps
- Unique on (`manuscript_id`, `round`, `email`). Indexes: (`reviewer_id`, `status`), (`status`, `review_due_at`) and (`status`, `response_due_at`).

**`reviews`**

- `id`, `review_assignment_id` (unique)
- `recommendation` (null while in draft)
- `comments_to_author` json (limited rich text)
- `confidential_to_editor` json null
- `answers` json null
- `submitted_at` (null means a draft), `unlocked_at`, `unlocked_by`
- timestamps

**`decisions`** (immutable)

- `id`, `manuscript_id`, `round`
- `type`
- `letter_subject`, `letter_body` (exactly as sent), `letter_locale`
- `attached_file_ids` json
- `revision_due_at` null, `override_reason` null
- `decided_by`, `sent_at`

**`manuscript_messages`** (comments and threads, immutable; a correction is a new message)

- `id`, `manuscript_id`, `round`
- `channel`: `editorial` (admins only), `author` (admins and the author) or `reviewer` (admins and one reviewer)
- `review_assignment_id` (required when the channel is `reviewer`)
- `sender_id`, `sender_role`
- `body` text (plain text, rendered escaped)
- `anchor` json null (later: `{versionId, blockId, quote}`)
- `created_at`
- Index on (`manuscript_id`, `channel`, `review_assignment_id`, `id`).
- **There is no reviewer↔author channel** (COPE).

**`message_reads`**: (`message_id`, `user_id`, `read_at`). Used for the "unread" counts.

### 5.4 Audit and mail

**`manuscript_events`** (append-only)

- `id`, `manuscript_id`, `round`
- `actor_id` (null means the system), `actor_role`
- `type` string(40) (`EventType` enum)
- `from_status`, `to_status`
- `audience`: `editors`, `author` or `all`. Events for reviewers are filtered by `subject` = their assignment.
- `subject_type`, `subject_id`
- `payload` json, `ip` null, `created_at`
- Indexes: (`manuscript_id`, `id`) and (`type`, `created_at`).

**`mail_log`**

- `id`, `manuscript_id` null, `user_id` null, `to_email`
- `notification` (class basename), `subject`
- `status`: `sent` or `failed`; `error`
- `created_at`
- Filled by `App\Listeners\LogNotification` listening to `NotificationSent` and `NotificationFailed`.
- `prunable()` keeps 3 years (configurable).

**Immutability**

- The `ManuscriptEvent`, `ManuscriptVersion`, `Decision` and `ManuscriptMessage` models throw `LogicException` on `updating` and `deleting`. The only exception is the PDF columns of a version.
- For SQLite the migration creates `CREATE TRIGGER manuscript_events_no_update BEFORE UPDATE ON manuscript_events BEGIN SELECT RAISE(ABORT,'append-only'); END;`, a matching `BEFORE DELETE` trigger, and the same pair for `decisions`. `manuscript_versions` gets a delete trigger and an update trigger that allows changes only to the PDF columns.
- The triggers are guarded by `DB::getDriverName() === 'sqlite'` and dropped in `down()`.

### 5.5 Enums, models and factories

- **Enums** (`app/Enums/`): `Role`, `ManuscriptStatus`, `RevisionKind`, `AssignmentStatus`, `Recommendation`, `DecisionType`, `PaymentStatus`, `FileKind`, `FileVisibility`, `MessageChannel`, `EventType`, `VersionKind`.
- **TypeScript mirrors** live in `resources/js/types/manuscript.ts`. `EnumMirrorTest` parses that file and fails when a case is missing.
- **Models**: `Manuscript`, `ManuscriptDraft`, `ManuscriptVersion`, `ManuscriptContributor`, `ManuscriptFile`, `ReviewAssignment`, `Review`, `Decision`, `ManuscriptMessage`, `ManuscriptEvent`, `MailLog`, `UserRole`, `UserEvent`. Route key is `public_id` where one exists.
- **Factories**:
    - `UserFactory::admin()/author()/reviewer()`
    - `ManuscriptFactory::draft()/submitted()/underReview()/revisionRequested()/accepted()`, built **through the workflow service** so fixtures are always valid
    - `ReviewAssignmentFactory::invited()/accepted()/submitted()`

---

## 6. Manuscript template and editor

### 6.1 Content document (`manuscript_drafts.content`, frozen as `manuscript_versions.content`)

```jsonc
{
  "schema": 1,
  "meta": {
    "type": "original_scientific_paper", "language": "en",
    "title": InlineDoc, "running_title": "…",            // ≤ 80 chars, else auto-truncated with "…"
    "abstract": RichDoc, "keywords": ["…"],              // 3–6
    "abbreviations": [{ "abbr": "CBD", "definition": "cannabidiol" }],
    "invited": false
  },
  "authors": [{ "id": "a1", "given": "…", "family": "…", "given_alt": "…", "family_alt": "…",
                "affiliations": ["f1"], "corresponding": true, "email": "…", "phone": "…", "orcid": "…" }],
  "affiliations": [{ "id": "f1", "organisation": "…", "street": "…", "postal_code": "…",
                     "city": "…", "country": "…", "organisation_alt": "…" }],
  "summary": { "title": InlineDoc, "abstract": RichDoc, "keywords": ["…"] },   // the other language
  "sections": [{ "id": "s-…", "key": "introduction", "variant": null, "title": null, "content": TipTapDoc }],
  "appendices": [{ "id": "…", "letter": "A", "title": "…", "content": TipTapDoc }],
  "end_matter": { "acknowledgements": RichDoc, "funding": "…", "conflict_of_interest": "…",
                  "ethics": { "humans": false, "animals": false, "statement": "…" },
                  "data_availability": "…", "ai_use": "…" },
  "references": [{ "id": "r-…", "csl": { … }, "raw": null, "status": null }]
}
```

- **Every block carries a stable `id`** from the TipTap UniqueID extension. Verify the package name at install time. The ids drive the diff alignment and cross-references.
- **Server validation**: `App\Manuscripts\Schema\ContentValidator` runs on every autosave and on freeze. It checks:
    - an allowlist of node types, marks and attributes with their types;
    - the content rules (cell → paragraph only, no nested tables or lists in cells);
    - unknown keys, which are rejected;
    - maximum depth 12, maximum JSON size 2 MB, and caps on tables, figures and footnotes.
    - A violation returns **422**. Unknown nodes are never stored.

### 6.2 Article types and skeletons (`config/manuscript.php`)

```php
'types' => [
  'original_scientific_paper' => ['label' => ['en' => 'Original scientific paper', 'mk' => 'Оригинален научен труд' /* TO CONFIRM */],
      'languages' => ['en'], 'abstract_words' => 250, 'skeleton' => 'research', 'max_floats' => null, 'max_pages' => null],
  'short_communication' => ['…', 'abstract_words' => 100, 'skeleton' => 'research', 'max_floats' => 2, 'max_pages' => 10],
  'review_paper'        => ['…', 'abstract_words' => 250 /* TO CONFIRM: IFA silent */, 'skeleton' => 'review', 'invited' => true],
  'mini_review'         => ['…', 'enabled' => false /* TO CONFIRM offered */, 'skeleton' => 'review', 'invited' => true],
  'professional_paper'  => ['label' => ['en' => 'Professional paper', 'mk' => 'Стручен труд'], 'languages' => ['en', 'mk'], 'abstract_words' => 250, 'skeleton' => 'research'],
  'case_report'         => ['…', 'enabled' => false /* TO CONFIRM */],
],
'skeletons' => [
  'research' => [
    ['key' => 'introduction', 'required' => true],
    ['key' => 'methods', 'required' => true, 'variants' => ['material_and_methods', 'materials_and_methods', 'theoretical_background', 'experimental']],
    ['key' => 'results_discussion', 'required' => true, 'variants' => ['combined', 'separate']], // separate → results + discussion
    ['key' => 'conclusion', 'required' => true, 'may_nest' => true],                           // may be an L2 inside results/discussion
  ],
  'review' => [
    ['key' => 'introduction', 'required' => true],
    ['key' => 'custom', 'repeatable' => true, 'min' => 1],   // author-titled
    ['key' => 'conclusion', 'required' => true],
  ],
],
'abstract_limit_mode' => 'warn',        // TO CONFIRM: warn | block
'keywords' => ['min' => 3, 'max' => 6],
'suggested_referees' => ['count' => 3, 'required' => true],   // TO CONFIRM
'table_header_bold' => false,           // TO CONFIRM
'numeric_column_align' => 'center',     // TO CONFIRM
'figures' => ['mimes' => ['png', 'jpg', 'jpeg'], 'max_kb' => 10240, 'min_dpi_warning' => 300],
'labels' => [   // keyed by MANUSCRIPT language, not UI locale
  'en' => ['abstract' => 'Abstract', 'keywords' => 'Key words', 'introduction' => 'Introduction',
           'material_and_methods' => 'Material and methods', 'results_discussion' => 'Results and discussion',
           'conclusion' => 'Conclusion', 'acknowledgements' => 'Acknowledgements', 'references' => 'References',
           'table' => 'Table', 'figure' => 'Fig.', 'received' => 'Received', 'accepted' => 'Accepted', 'summary' => 'Резиме'],
  'mk' => ['abstract' => 'Апстракт', 'keywords' => 'Клучни зборови', 'introduction' => 'Вовед', 'conclusion' => 'Заклучок',
           'references' => 'Литература', 'table' => 'Табела', 'figure' => 'Слика', 'summary' => 'Summary',
           /* methods, results, acknowledgements, received/accepted: TO CONFIRM */],
],
'hints' => ['introduction' => 'State the objectives of the work and provide an adequate background, …' /* IFA verbatim */],
'pdf' => [ /* §7.2 */ ],
```

- Acknowledgements, Conflict of interest / Funding (TO CONFIRM printing), References, Appendices and the Summary are **generated** from structured data. They are not free sections.
- Headings are **unnumbered** and have **two levels only**: L1 is the section, L2 the `subheading`.
- Changing the article type re-seeds missing required sections after a confirmation and never deletes content: removed sections become `custom` sections.
- The config is shared with the editor and the submit pages only, as the `manuscriptTemplates` prop built by `App\Manuscripts\Templates::forFrontend()`.

### 6.3 Editor page: `resources/js/pages/author/manuscripts/edit.tsx`

The page uses its own `layouts/editor-layout.tsx`, with a slim top bar and no app sidebar, for focus. It has three zones.

1. **Left rail (collapsible)**
    - Outline of steps, sections, tables, figures and equations, each clickable.
    - A **live checklist** of errors and warnings from the server checker, each with "Go to".
2. **Centre canvas**
    - A paper-like sheet set in the print font (Liberation Serif woff2, self-hosted) at the print measure, laid out in printed order.
    - **Front matter is edited in place and styled like page 1:**
        - the journal block greyed out ("Volume, pages and DOI are assigned on publication");
        - the title in an `InlineEditor` (italic, sub, sup and symbols; no Enter);
        - the running title with a preview of the truncation.
    - **Authors** appear as chips with superscript numbers. A popover holds given and family name, the other-script name, an affiliation multi-select, the corresponding flag, e-mail, phone (required when corresponding) and ORCID. Chips can be dragged to reorder. "Add me" fills the row from the profile, and recently used co-authors and affiliations are suggested.
    - **Affiliations** form an ordered list, numbered by first use exactly as printed. Each has a version in the other language.
    - **Abstract**: paragraphs with italic, sub and sup only, and a live word counter ("212 / 250"). **Key words** are chips (3–6).
    - **Body**: one `SectionEditor` card per skeleton entry.
        - Fixed headings are plain, non-editable text from `labels`.
        - Variants are a select, for example "Material and methods" or "Theoretical background".
        - Reviews get "Add section", with an editable title and drag to reorder. Appendices are added the same way.
        - Each empty section shows the IFA hint as a placeholder.
    - **End matter** is a set of fields: Acknowledgements, Funding, Conflict of interest (default text from config), Ethics (checkboxes plus a statement), Data availability and AI-use disclosure (both toggled by config).
    - **References** are generated as a list in print style.
    - **Резиме / Summary** has the title, abstract and keywords in the other language. Authors and affiliations are pulled from the author records, so the 71_2_001 error, where four authors were missing from the Резиме, cannot happen.
3. **Right panel (tabs)**
    - **References**: library, add, paste, DOI lookup.
    - **Insert**: table, figure, equation, symbol palette.
    - **Preview**: the server HTML in a page frame, plus "Download PDF proof" (queued; shows a spinner, then the link).

**Body schema** (one shared extension list in `resources/js/lib/manuscript/schema.ts`)

- **Blocks**: `paragraph`, `subheading` (L2, italic, its own line), `bulletList` / `orderedList` (allowed, not promoted), `tableBlock`, `figureBlock` and `equationBlock` (release 5).
- **Marks**: `italic`, `bold`, `subscript` and `superscript`. Sub and sup cannot be combined. There is **no** underline, colour, font, size, alignment or link mark; URLs belong in references.
- **Inline nodes**:
    - `citation {refIds[], mode: parenthetical|narrative, locator?}`
    - `xref {targetId}`, which renders "Table 2", "Fig. 1" or "Eq. (3)" with the live number
    - `footnote {content: inline}`
    - `inlineMath {latex}` (release 5)
    - `tableNoteRef {noteId}`, allowed only inside table cells
- **Toolbar**: Italic, Bold, x₂, x², Symbol, Subheading, List, Table, Figure, Equation, Cite, Cross-reference, Footnote, Undo and Redo.
- **Shortcuts**: Ctrl+I, Ctrl+B, Ctrl+= for subscript and Ctrl+Shift+= for superscript.
- **Symbol palette**:
    - Greek: α β γ δ Δ κ λ µ (U+00B5) π σ Σ χ
    - Operators: ± × − (U+2212) – ≤ ≥ ≈ ~ → √ ∑ · ‰
    - ° and the quotation marks ’ “ ” „

**Tables (`tableBlock`), journal booktabs style**

- Structure: `tableBlock {id, size: normal|small, landscape: false}` contains `tableCaption` (inline), then `table`, then `tableNotes`.
- The table uses `@tiptap/extension-table` (TableKit, prosemirror-tables). Cells and headers support colspan and rowspan, and a cell holds **paragraphs only** (no images, nested tables or lists).
- **Row attribute** `kind: header | body | group`. A `group` row is a full-width, centered row with thin rules above and below.
- **Cell attribute** `align: left | center | right`, set per column from a column menu. The first column is always left. The default for numeric columns comes from config.
- **Notes**: `tableNotes` holds `tableNote {id, kind: letter | significance | free}`. Letters a, b, c are assigned in order of the first `tableNoteRef`. Significance notes use the markers `*`, `**` and `***`. A free note is something like "Abbreviations: …".
- **Not available to authors**: borders, shading, column widths (tables keep their natural width up to the text width and are centered) and caption numbers ("Table N." is generated, with no final period, which is enforced).
- **Saving**: empty rows are stripped.
- **The editor already shows the booktabs look**, through `manuscript.css` scoped to `.ms`, so authors see the journal style while typing.
- **Pasting from Word or Excel**: TSV or HTML tables become a `tableBlock` with all styling dropped, and the first row becomes the header.

**Figures (`figureBlock {id, fileId, width: 25|50|75|100, alt}` + `figureCaption`)**

- Upload PNG or JPEG. SVG and TIFF are not allowed in v1: TIFF gets "Export as PNG", because the server has no gd or imagick.
- Alt text and caption are required. The caption sits **below** the image.
- A DPI warning is computed from the pixel width at the chosen print width.
- Images are served through the policy-checked `files/{file}?inline=1` route.

**Numbering**

- The `useNumbering()` hook walks all sections and appendices in order.
- It numbers Tables, Figures, Equations and footnotes; appendices give "Table A.1", "Fig. A.1" and "Eq. (A.1)".
- Cross-references show the live number.
- The checker warns when the order of first mention differs from the block order.
- The same algorithm exists in PHP (`App\Manuscripts\Rendering\Numbering`), and shared fixtures assert that both sides agree.

**References and citations**

- **Storage**: CSL-JSON-like items. Types are `article-journal`, `book`, `chapter`, `report`, `legislation`, `webpage`, `thesis` and `raw`. Fields: author[], issued (with a year suffix), title, container-title (abbreviated), volume, issue, page, article-number, publisher, place, editor[], edition, URL, accessed and DOI. `status` may be `in_press`, `unpublished` or `personal_communication`.
- **Forms**: one structured form per type.
- **DOI lookup**: `GET /author/references/lookup?doi=` is a server proxy to `api.crossref.org/works/{doi}` with a 5 s timeout, a 1-day cache, a `mailto` value from config and a throttle of 30 per minute.
- **Paste a formatted list**: each line becomes a `raw` item. A heuristic extracts author and year for the label, and the item is flagged "Check fields", which produces a warning.
- **"In press"** requires an uploaded title page (IFA).
- **`App\Manuscripts\Citations\HarvardFormatter` (PHP) is authoritative.** It applies these rules:
    - **List order**: alphabetical, then chronological, with a/b suffixes.
    - **Authors**: all of them are listed as `Surname, I.I.`.
    - **Year**: ", YEAR." after the authors.
    - **Styling**: no italics.
    - **Edited volumes**: "In:" (TO CONFIRM).
    - **Pages**: an en dash in ranges, or `Volume(Issue), pages` or the article number.
    - **DOI**: `https://doi.org/…`.
    - **Web references**: "Available at: URL (accessed on DD.MM.YYYY)."
    - **In-text citations**: "(A and B, 2019)", "(A et al., 2014; …)" with groups sorted per the IFA, and the narrative form "A et al. (2022)".
- **Labels in the editor**: the editor shows citation chips. A TypeScript twin, `resources/js/lib/manuscript/citations.ts`, produces labels only. Both formatters are tested against `tests/fixtures/references.json`, which holds the three IFA examples and the four verbatim PDF references.
- **"Link citations" tool**: it converts plain-text "(Smith et al., 2020)" occurrences that match a reference into `citation` nodes.

**Paste from Word**

- `transformPastedHTML` in `resources/js/components/manuscript/editor/paste/word.ts` strips `mso-*`, `<o:p>`, styles, classes and empty spans.
- It maps b, i, sub and sup. Pasted headings become subheadings.
- The schema drops everything else.
- A full "Import from Word" (mammoth.js, client-side) splits headings into sections. It arrives in release 5 and is labelled "approximate".

**React and SSR**

- Use `useEditor({ immediatelyRender: false })`. Editors are loaded with `React.lazy` and mounted only on the client, so the Inertia SSR bundle never imports ProseMirror.
- Test with the React Compiler on. If editor components show stale-render bugs, add `'use no memo'` to them.

**Packages**

- **Pin exact versions** at install, with no `^`. **MIT only**, and never `@tiptap-pro/*`. Verify every package name on npm before adding it.
- **TipTap**: `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, the individual node and mark extensions (document, paragraph, text, bold, italic, subscript, superscript, lists), `@tiptap/extension-table`, `@tiptap/extension-unique-id` and `@tiptap/extensions` (Placeholder, UndoRedo, CharacterCount, Gapcursor, TrailingNode).
- **Other**: `diff` (jsdiff, BSD-3), `katex` (editor preview only, release 5), `mammoth` (release 5) and `mathjax-full` (server script, release 5).
- **New shadcn primitives**: textarea, tabs, table, radio-group, popover, command, switch and scroll-area.

### 6.4 Release 2 fallback: upload mode

Until release 3, step "Body" is a single `body_upload` file (DOCX, DOC, ODT or PDF, as `Submission::MANUSCRIPT_EXTENSIONS`). All other metadata is still structured, and the version gets `source = upload`. Reviewers review the file, and the structured preview, PDF and diff are hidden for these versions. After release 3, upload mode stays available to admins only, for legacy and special cases.

### 6.5 Autosave

- **Endpoint**: `PATCH /author/manuscripts/{m}/draft`, sent as a JSON `fetch` with the `X-XSRF-TOKEN` header, not as an Inertia visit. The body is `{lock_version, content?, submission_data?, response_to_reviewers?}`. Only changed parts are sent.
- **Timing**: after 1.5 s idle, on blur, on step change, at most every 20 s while typing, and with a `fetch(..., {keepalive: true})` on `visibilitychange` (because `sendBeacon` cannot set headers). Throttle: 120 per minute.
- **Response**: `{lock_version, saved_at, issues[]}`. The checker runs on every save, which is cheap.
- **Conflict (409)**: a dialog says "Changed in another window", with Reload or "Keep mine (overwrite)".
- **Local backup**: a `localStorage` copy under `mpb-draft:{public_id}`, wrapped in try/catch, is offered for restore when it is newer than the server copy.
- **Status pill**: "Saved 14:02", "Saving…" or "Offline — changes kept on this device".
- **Editable states**: only `draft` and `revision_requested`. Any other state returns **423** and the UI is read-only. Only the submitter edits; co-author editing is open question Q14.

### 6.6 Validation before submit

`App\Manuscripts\Validation\ManuscriptChecker::check(Draft): Report` returns issues `{code, severity: error|warning, path ('meta.keywords' | 'sections.s-…#blockId'), message (translation key + vars)}`. It is shared by autosave, the check page and `ManuscriptWorkflow::submit`. **Errors block submission. Warnings do not.**

**Errors**

- **Type and language**: the type and language combination must be allowed (`mk` only for `professional_paper` and other contributions).
- **Front matter**:
    - a title is present;
    - the abstract is present and within its limit in `block` mode;
    - there are 3–6 keywords;
    - the summary title, abstract and keywords are present.
- **Authors and affiliations**:
    - every author has an other-script name and at least one affiliation;
    - affiliations are complete in both languages;
    - at least one corresponding author has an e-mail and a phone.
- **Body**:
    - required sections are present and not empty;
    - every table and figure has a caption;
    - every figure has alt text and an existing file;
    - every citation and cross-reference resolves;
    - references have the required fields for their type;
    - a short communication has at most 2 tables plus figures.
- **Declarations and attachments**:
    - an ethics statement is present when humans or animals are ticked;
    - all declarations are ticked;
    - the APC is acknowledged when the APC is enabled;
    - 3 suggested referees with valid e-mails, none matching an author (TO CONFIRM required);
    - the required forms are uploaded (TO CONFIRM);
    - on resubmission, the response to reviewers is not empty.

**Warnings**

- the abstract is over the limit (`warn` mode);
- the title ends with a period or contains an abbreviation;
- a reference is never cited;
- a table or figure is never cross-referenced, or the numbering order differs from the order of first mention;
- "&" appears in a citation;
- an abbreviation is used before it is defined;
- a figure is under 300 dpi;
- a reference is `raw`;
- a short communication is estimated at more than 10 pages (from the last proof);
- under double-anonymous review, an author's surname or a self-identifying phrase ("our previous work") appears in the body.

**Check and submit page: `author/manuscripts/submit.tsx`**

- the report grouped by section, each item with a "Go to" link;
- the IFA declarations and checklist, the licence text from config, suggested and opposed referees, the cover letter and the forms;
- the APC note with the amount from config, shown only when the APC is enabled;
- a final preview;
- one "Submit manuscript" button, followed by a confirmation dialog that repeats the declarations.

---

## 7. Preview and PDF (one-column body)

### 7.1 HTML renderer

- **`App\Manuscripts\Rendering\ManuscriptRenderer::render(array $content, RenderOptions $o): RenderedManuscript`**
    - Returns `{html, blocks[{id,section,type,text,html}], numbering, footnotes}`.
    - Options:
        - `audience`: `author`, `editor` or `reviewer`
        - `anonymise` (bool)
        - `variant`: `screen`, `submission`, `review`, `accepted` or `proof`
        - `issue` metadata
        - `paragraphNumbers` (bool)
- **Node renderers** live in `app/Manuscripts/Rendering/Nodes/*`, one class per node, about 20 in total.
    - Text is escaped with `e()` and attributes come from the allowlist.
    - Reference URLs and DOIs are limited to `http` and `https`.
    - Math is emitted as cached, sanitised SVG. The SVG allowlist is `svg g path use defs rect title` with the attributes `d transform viewBox width height fill stroke href`; there is no script, no `foreignObject` and no event attribute.
- **Second layer**: the output goes through `symfony/html-sanitizer` (new composer dependency; match the Symfony major used by Laravel 13), whose allowlist includes `ins`, `del`, `sub` and `sup`.
- **Front and end matter** are generated from metadata. `anonymise` drops the authors, affiliations, acknowledgements, funding, the corresponding footnote and the summary author block. `submission_data` is never passed in.
- **On screen**: `components/manuscript/manuscript-frame.tsx` displays the renderer output with `dangerouslySetInnerHTML`. This is commented as allowed only for renderer output.

**`resources/css/manuscript.css`** is scoped to `.ms`, imported by the editor canvas and the preview, and inlined into the PDF.

- Booktabs tables:
    - `table.ms-table { border-collapse: collapse; margin-inline: auto; border-top: 1.5pt solid; border-bottom: 1.5pt solid }`
    - `thead tr:last-child th { border-bottom: .5pt solid }`
    - `tr.ms-group td { text-align: center; border-block: .5pt solid }`
    - spanning header cells: `th[colspan] { box-shadow: inset 0 -.5pt }` with side padding (the cmidrule trim)
    - cell padding 3pt 6pt, `vertical-align: top`, header weight from the variable `--ms-th-weight`
    - **no vertical rules and no shading**
- Captions: `.ms-caption { display: grid; grid-template-columns: 15mm 1fr }`, so "Table 1." sits in regular weight in the first column with a hanging indent. Tables have the caption **above**, figures **below**.
- Table notes: 9 pt, aligned to the left edge of the table.
- Body: justified, 6 mm first-line indent on every paragraph, no paragraph spacing. L1 headings are 11 pt bold; L2 headings are 10.5 pt italic.
- The existing `.prose-journal table` grid style is **not changed**, so the public CMS pages are unaffected.

### 7.2 PDF

**Engine**

- `app/Manuscripts/Pdf/PdfEngine.php` is an interface. `WeasyPrintEngine` runs `Process::run([config('manuscript.pdf.binary'), '--pdf-variant', 'pdf/ua-1', $html, $out])` with a 120 s timeout. `NullEngine` is used in tests.
- The HTML, fonts and **copied figure files** go in a temporary directory passed as `--base-url`, so WeasyPrint never fetches over HTTP.
- The template is `resources/views/pdf/manuscript.blade.php`, with `manuscript.css` and `manuscript-print.css` inlined.
- Fonts live in `resources/fonts/pdf/` with their licence files committed: **Liberation Serif** R, I, B and BI (OFL; Latin, Greek and Cyrillic) and **STIX Two Math** for symbols. They are loaded with `@font-face` from `file://` URLs.

**Job**

- `App\Jobs\GenerateVersionPdfs` is queued (`ShouldQueueAfterCommit`, tries 2).
- It writes `manuscript_files` rows of kind `generated_pdf` and records the event `pdf_generated`.

**Geometry** (`config('manuscript.pdf')`, all TO CONFIRM)

- Page size: `205.2mm 287.2mm`, the journal trim, with A4 as the alternative.
- `@page :left/:right` with mirrored margins: inner 24 mm, outer 21 mm, top 21.7 mm to the body, bottom 23 mm. This gives a **160 mm one-column text block** (the alternative is 176 mm with an 11/16 pt body).
- Body 10.5/14.5 pt, justified, hyphenated according to the `lang` attribute (en or mk), with a 6 mm indent.
- Abstract and references 9/11 pt; references have a 15 pt hanging indent.
- Tables 10 pt, or 9 pt when `size = small`. Captions 10 pt.

**First page** (`@page :first`, no running head and no footer)

- Right-aligned 4-line block: the italic journal name, the bold volume, ISSN, DOI and the italic article type.
- About 80 pt of space, then the title (18 pt bold, centred) and the authors (14 pt, with superscripts such as "1*").
- Affiliations in 10 pt italic, then "Received: Month YYYY; Accepted: Month YYYY" in 9 pt.
- A 0.75 pt rule, the Abstract, the Key words and another 0.75 pt rule, then the one-column body.
- The footnote area at the bottom of the page (`float: footnote`) holds a short rule, then "*email: …", then the abbreviations, if any.

**Pages 2 and later**

- Running heads come from `string-set`:
    - **Even pages**: the italic page number at the outer left, and the centred author line "R. Ali, O. Majstorov, …" (every author, initials and surname, up to 2 lines).
    - **Odd pages**: the centred running title, or the title truncated with "…", and the page number at the outer right.
    - A 0.25 pt rule runs under the head.
- Footers sit on the inner side. Even pages show "Maced. pharm. bull., **{vol}** ({issue}) {first} – {last} ({year})"; odd pages show the "Макед. фарм. билт., …" version. The strings come from config, with a spaced en dash in the range.

**Floats**

- Floats are always full width, with `break-inside: avoid` across the caption and its object.
- `thead { display: table-header-group }`, and rows never break.
- A table that continues on the next page shows "Table N. (continued)" (wording TO CONFIRM).

**End matter**

- Order: Acknowledgements, then [Conflict of interest / Funding], then References, then [Appendices], then the Summary.
- The Summary starts with a 0.5 pt rule and a centred **Резиме**, and the keywords come **before** the abstract.
- It stays on the same page when roughly 40 % of the page is free; otherwise it starts a new page.

**PDF metadata**: Title, Author, Subject (journal, volume and DOI), Keywords and Lang, as a tagged PDF.

**Variants**

| Variant      | When        | Content                                                                                                                                                                                                  |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submission` | each freeze | "Submitted manuscript · MPB-2026-0007 · v2" in the head. No DOI or volume. Pages numbered from 1.                                                                                                        |
| `review`     | each freeze | The same, plus **paragraph numbers in the margin** ("¶12", from CSS counters; WeasyPrint cannot number lines) and the footer "Confidential — for peer review only". Anonymised under `double_anonymous`. |
| `accepted`   | on accept   | The verbatim early-version cover text from the archive (72_1_006 and others).                                                                                                                            |
| `proof`      | production  | The full journal block, DOI, and a page counter starting at `first_page`.                                                                                                                                |

**Interim and fallback**: in release 3, `manuscripts/{m}/preview` has a "Print / Save as PDF" button that uses `manuscript-print.css` in the browser.

**Server**: DEPLOY.md gets:

- `pipx install weasyprint==<pinned ≥ 69>`. The Ubuntu apt package may predate the CVE fix, so verify on the target release.
- `libpango-1.0-0` and `libpangoft2-1.0-0`.
- `config('manuscript.pdf.binary')`.
- A note that the queue worker must be running.

No Chromium, gd or LibreOffice is needed.

### 7.3 Equations (release 5)

- Authors type LaTeX and see a live KaTeX preview.
- When the preview is rendered and at freeze, `scripts/render-math.mjs` (Node 22 is already on the server for SSR, plus a pinned `mathjax-full`) converts LaTeX to SVG.
- The SVG is sanitised and cached in `versions.math`.
- Display equations are centred with "(n)" flush right. They are referenced as "Eq. (n)" and numbered "(A.1)" in appendices.

---

## 8. Reviewer workspace

All pages require `auth`, `verified`, `role:reviewer` and a policy check. The reviewer sees **only their own assignments** (`whereBelongsTo($user, 'reviewer')`).

### 8.1 Invitation

1. **The admin invites** from the manuscript page (§9). For each e-mail, `ManuscriptWorkflow::inviteReviewers()`:
    - normalises the e-mail and runs the COI check (same as an author's or the submitter's e-mail, on the opposed list, or same institution domain gives a warning);
    - rejects a duplicate for the same (manuscript, round, e-mail);
    - creates the assignment (`invited`, token hash, `token_expires_at` = review due + 7 days);
    - links `reviewer_id` if the user already exists;
    - writes the event `reviewer_invited`, queues `ReviewerInvitation`, and moves `submitted`/`resubmitted` to `under_review` on the round's first invitation.
2. **The e-mail** contains the title, abstract, type and both deadlines, with **Accept** and **Decline** buttons that both open the signed link.
3. **`GET invitations/{assignment}/{token}`** renders `auth/invitation.tsx` in AuthLayout styling.
    - It checks the token with `hash_equals` against `token_hash`, and that the status is `invited`.
    - It shows the journal, type, title, abstract, keywords, deadlines and a summary of the COPE reviewer guidelines (lang file). Author names appear **only** under `single_anonymous`. The full text is **never** shown before acceptance.
4. **Decline** (`POST …/decline`) needs no account. It takes an optional reason and an optional "suggest a colleague" (name and e-mail), consumes the token and writes the event `reviewer_declined`.
5. **Accept** (`POST …/accept`) requires a **competing-interests declaration** ("I have no competing interests" or a description) and the confidentiality checkbox.
    - The account is then resolved as in §3.3.
    - The assignment becomes `accepted` with `responded_at` set, the token is consumed, the event `reviewer_accepted` is written with the COI payload, and the admins are notified.
6. **Expired, used or cancelled links** show `auth/invitation-invalid.tsx` with the editorial e-mail and a sign-in button.
7. **Config**: `journal.review.require_acceptance = true`. When it is false the accept step becomes a single button, but the COI declaration stays mandatory.

### 8.2 `reviewer/reviews/index.tsx`

- Cards show reference, type, title, round, status, the due date with a countdown badge ("Due in 5 days" / "Overdue") and the action ("Respond", "Write review", "View").
- A "Completed" tab lists past reviews. The decision is shown only when `journal.review.reviewers_see_decision` is set (TO CONFIRM).

### 8.3 `reviewer/reviews/show.tsx`

**Left pane (about 60 %)**

- **Manuscript**: the **frozen version** for the assignment, rendered with `audience = reviewer` (anonymised per config) and ¶ numbers that match the review PDF. Upload-mode versions show the file instead.
- **Files**: supplementary files with visibility `editors_reviewers` or `all_parties` from the assigned versions.
- **Previous round** (round 2 and later): the author's response to reviewers, the reviewer's own earlier review and the compare view (§10).
- A "Download review PDF" button.

**Right pane (sticky review form)**, autosaved with `PATCH reviewer/reviews/{a}/review`:

1. **Recommendation**: four large radios with one-line explanations, and the footnote "The editor makes the final decision".
2. **Comments to the author**: required, limited rich text (italic, sub, sup). "Quote ¶" inserts "¶12: …" when a paragraph number is clicked.
3. **Confidential comments to the editor**: optional, labelled "Never shown to the author". This is the owner's "note back to the admin".
4. **Optional structured questions** from `config('journal.review.questions')`: originality, methodology, statistics, language and references, on a 1–5 scale or yes/no. They are off by default (TO CONFIRM).
5. **Attachments**: drag and drop, up to 20 MB. Each file has a toggle between "Share with the author (anonymised)" (`editors_author`) and "Editor only". A hint warns that file properties may reveal the reviewer's name.
6. **Submit review** shows a summary and asks for confirmation. `ReviewWorkflow::submit` sets the assignment to `submitted`, records the event `review_submitted` and notifies the admins. The review then becomes read-only until an admin unlocks it.

**Below the form**

- **Messages with the editor**: the `reviewer` channel, with attachments that are visible to editors only.
- **Request extension**: posts a message; the admin changes the date, which produces an event.
- **"I can no longer complete this review"**: cancels the assignment with a reason and notifies the admin.

**What reviewers never see**: other reviewers' identities, other confidential notes, the editorial channel, the author channel, payments, or (under double-anonymous review) the author identities, including file names and PDF metadata. Seeing other reviewers' comments to the author is controlled by `journal.review.share_reviews_between_reviewers` (default false).

### 8.4 Deadlines and reminders

- **Command**: `journal:reminders`, scheduled in `routes/console.php` daily at 08:00 Europe/Skopje.
- **Config** (`config('journal.workflow')`, all TO CONFIRM):
    ```php
    'response_days' => 7, 'review_days' => 21, 'revision_days' => 30, 'grace_days' => 3,
    'reminders' => ['invitation_after_days' => [4], 'review_before_due_days' => [3, 0],
                    'overdue_every_days' => 7, 'max_overdue' => 3, 'revision_before_due_days' => [7, 1]],
    ```
- **What it does**: it sends invitation reminders; expires unanswered invitations after the response date plus grace (with an event and the token cleared); sends review due-soon, due-today and overdue reminders; and sends revision reminders to authors.
- **Idempotency** comes from `reminders_sent` and `last_reminded_at`. Each reminder writes an event and a `mail_log` row.

---

## 9. Admin workspace, including payments

All admin pages require `auth`, `verified`, `role:admin` and `EnsureAdminTwoFactor`. The admin sees every manuscript and every author.

### 9.1 `admin/index.tsx`: the editorial desk

Attention queues, each with a count and a link to the filtered list:

- new submissions awaiting the technical check
- invitations unanswered past their response date
- overdue reviews
- reviews complete and awaiting a decision
- revisions received
- revisions overdue
- accepted and unpaid
- unread messages
- withdrawal requests
- mail queue health: N jobs pending, oldest X minutes

### 9.2 `admin/manuscripts/index.tsx`

- **Columns**: reference, title, corresponding author, type, status badge, round, reviews (for example "2/3 done" with an overdue dot), submitted, days in status, last activity, payment badge.
- **Filters** (in the query string): status (multiple), type, language, round, year received, payment status, overdue (reviews or revision), handling editor and "needs action". Search covers reference, title and contributor names and e-mails.
- **Paging and sorting**: 25 per page, sortable, plus CSV export that reuses `csvCell()` (formula-injection guard).
- **Row actions**: Open and Mark paid.

### 9.3 `admin/manuscripts/show.tsx`

**Sticky header**

- Reference, title, status, round, payment pill and handling editor.
- A **contextual primary button**: "Invite reviewers", "Make decision" or "Start round 2".
- The available actions are computed on the server from `allowedTransitions` and the policies and passed as a prop, so the UI never offers what the server would refuse.

**Tabs**

- **Overview**: all metadata, full author contacts, declarations and forms, the cover letter, suggested and opposed referees (each suggested referee has an **Invite** button), and a technical-check list (anonymisation, forms present, language). Upload-mode manuscripts show the file.
- **Manuscript**: version list (v1, v2… with round, kind, date and hash), the rendered view with a **Full / Reviewer-view** toggle to check exactly what reviewers see, the PDFs, the files and "Compare".
- **Reviewers**: assignments per round with Reviewer N, name, e-mail, status, invited/due dates, COI and reminders sent.
    - Actions: Remind now, Extend deadline, Cancel (with a reason), Unlock review, Re-invite in this round, Regenerate the invitation link (rotates the token, writes an event).
    - **Invite reviewers dialog**:
        - Multi-e-mail input: paste a list, each address is validated as a chip, with an optional name per chip.
        - Existing users are recognised and shown with their active load, number of past reviews and average turnaround.
        - COI warnings.
        - Response and review due dates, defaulting from config.
        - The invitation language (the known user's locale, otherwise a choice).
        - An editable message with a preview.
        - "Send N invitations".
        - In round 2 and later, a one-click "Re-invite round 1 reviewers".
- **Reviews**: every submitted review in full, including confidential comments, answers and files.
- **Decision**:
    - Choose the decision. The letter template comes from `lang/{en,mk}/letters/*.md` in the author's locale.
    - The letter is **pre-filled with each reviewer's comments to the author, labelled "Reviewer 1…"**, and never with confidential comments.
    - Attach files that reviewers marked as shareable, set the revision due date, preview, then **Send**. This runs the transition and stores the exact letter in `decisions`.
- **Discussion**: the editorial channel (admins only), the author channel and one channel per reviewer.
- **Files**: every file with kind, visibility and uploader (real names, since this is the admin view), with soft delete and upload on behalf of others.
- **Payment**: see §9.4.
- **Production** (release 5): volume, issue, pages, the suggested DOI, the proof PDF and Publish (create or link the `Article`).
- **History**: the full timeline, including the e-mails from `mail_log`.

**Admin corrections**: metadata changes after acceptance create the event `metadata_corrected` with a field diff. Content changes create a `production` version.

**Conflict-of-interest guard** (`journal.security.editor_conflict_guard`, default true, TO CONFIRM for a small office): an admin who is the submitter or a contributor (matched by e-mail) cannot see that manuscript's reviewer identities or reviews and cannot decide on it. The UI says "Another editor must handle this manuscript."

### 9.4 Payments

- **Panel fields**: status (Not required / Unpaid / Paid / Waived), amount and currency (prefilled from the snapshot, otherwise from config), payment date, reference (invoice or bank) and note. It shows who marked the payment and when.
- **Saving**: `PaymentService::record()` writes the event `payment_updated` with the before and after values. Reverting to unpaid requires a note and `password.confirm`.
- **Optional gates**: `journal.apc.required_before_production` and `journal.apc.required_before_publication`.
- **Author visibility**: the author sees only their own status, and only when `journal.apc.show_to_author` is set.
- **`admin/payments/index.tsx`**: accepted manuscripts and later, filtered by payment status and year, with totals per currency and status and a CSV export for the faculty finance office.

### 9.5 People

- **`admin/authors/index.tsx` and `admin/authors/{user}.tsx`** (the per-author view): the profile and contacts, every manuscript as submitter and as co-author (through contributors), statuses, payments (paid and unpaid counts) and their review record if they also review.
- **`admin/reviewers/index.tsx`**: the pool, with expertise, active, completed and declined counts, average turnaround, overdue count and last activity.
- **`admin/users/index.tsx` and `show.tsx`**: search, grant and revoke roles, deactivate and reactivate, resend verification, and the `user_events` log.
- **`admin/emails/index.tsx`**: the global `mail_log`, which answers "did the reviewer get the mail?".
- **`admin/submissions`** (legacy): read-only, now behind `role:admin`, with **Import as manuscript** (§13).

---

## 10. Track changes

1. **Status and event history for every status.**
    - `components/manuscript/event-timeline.tsx` reads `manuscript_events`, grouped by round, with icons per type. Each entry shows who, what, when, from → to, and a link to the letter or version.
    - **Filtering happens on the server** in `App\Manuscripts\Presenters\EventPresenter::for(User $viewer, Manuscript $m)`:
        - **Admin**: everything, including actor names, IP addresses and an expandable payload.
        - **Author**: `audience ∈ {author, all}` milestones only: submitted, "with reviewers" (no counts or names), decisions and letters, revision due, resubmitted, accepted, payment received (when configured), published and withdrawn. Reviewers appear only as "Reviewer N".
        - **Reviewer**: only events about their own assignment.
    - **Event types**:
        - lifecycle: `created`, `submitted`, `version_frozen`, `status_changed`, `decision_sent`
        - invitations: `reviewer_invited`, `invitation_resent`, `reviewer_accepted`, `reviewer_declined`, `invitation_expired`, `assignment_cancelled`
        - reviews: `review_submitted`, `review_unlocked`, `due_date_changed`, `reminder_sent`
        - files and messages: `file_uploaded`, `file_deleted`, `message_posted` (the channel only, not the body)
        - payment: `payment_updated`
        - withdrawal and appeals: `withdrawal_requested`, `withdrawn`, `reopened`
        - production: `metadata_corrected`, `production_metadata_changed`, `pdf_generated`, `published`, `imported_from_legacy`
2. **Frozen versions.** Every submit or resubmit freezes a version with the content, rendered HTML, per-block fragments, a SHA-256 hash and the PDFs. Reviewers and PDFs always use frozen versions, so the text never changes under a reviewer.
3. **Compare view** (`pages/manuscripts/compare.tsx`, shared by all roles; `GET manuscripts/{m}/compare?from=&to=`, checked by policy).
    - **Server** (`App\Manuscripts\Diff\VersionComparer`): sends both versions' `blocks`, already anonymised for reviewers, plus a field map of the metadata (title, abstract, keywords, authors as added/removed/reordered, affiliations, end matter) and the references as formatted strings.
    - **Client** (`components/manuscript/version-diff.tsx`):
        - aligns blocks by `id`, using an LCS over the id sequence and falling back to text LCS for blocks without a match;
        - marks each block as added (whole, green rail), removed (whole, red, struck through), moved or changed;
        - inside a changed paragraph, heading or caption it runs jsdiff `diffWordsWithSpace` and renders `<ins>`/`<del>` with accessible labels and a ± icon for colour-blind users;
        - compares tables cell by cell when the shape (rows × columns, spans) is unchanged, otherwise shows before and after side by side;
        - shows before and after thumbnails for figures whose file changed.
    - **Navigation**: a summary bar ("14 paragraphs changed · 1 table added · 3 references added"), "Show only changes", next and previous change, and a version picker.
    - **Access**: authors see their own versions; reviewers see the versions of rounds they took part in.
4. **Response to reviewers**: required on every resubmission except a technical return. It is pre-structured with one block per reviewer that quotes their comments. A file is optional. It is shown beside the diff.
5. **Not built**: Word-style suggestion mode. Later: comments anchored to frozen versions (`anchor = {versionId, blockId, quote}`).

---

## 11. E-mails and notifications

- **Base class**: `App\Notifications\Journal\JournalNotification`, using `ShouldQueueAfterCommit`, tries 3 and backoff `[60, 300]`.
- **Locale**: `->locale($notifiable->preferredLocale())`. People without an account get the locale chosen in the invite dialog.
- **Headers**: From is the journal address and Reply-To is `journal.editorial_email`. **No reviewer address ever appears in To, CC or Reply-To of mail to authors, and vice versa.**
- **Mail theme**: `php artisan vendor:publish --tag=laravel-mail`, then `resources/views/vendor/mail/html/themes/journal.css`. The header has the logo and the bilingual journal name. The footer reads "Macedonian Pharmaceutical Bulletin · Faculty of Pharmacy, UKIM", with the editorial address and "Design & development: Nexsol Labs".
- **Strings**: all go through `__()` with `lang/mk.json`. Letters and invitation templates live in `lang/{en,mk}/letters/*.md` (Macedonian wording TO CONFIRM). Fortify's verify and reset mails get Macedonian through `VerifyEmail::toMailUsing` and `ResetPassword::toMailUsing` in `AppServiceProvider`.
- **Links**: **bearer signed links appear only in `ReviewerInvitation`** (and in `LoginLinkNotification` if that is enabled). Every other mail links to authenticated pages, never to file URLs.

| Notification (`app/Notifications/Manuscripts/…`)                   | To                                                                      | Trigger                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `ManuscriptSubmittedToEditors`                                     | all admins, plus `journal.submissions_email` as an anonymous notifiable | submit, resubmit                                       |
| `SubmissionAcknowledgement`                                        | submitter (cc corresponding authors, TO CONFIRM)                        | submit, resubmit                                       |
| `ReviewerInvitation`                                               | invitee                                                                 | invite, resend, new link                               |
| `ReviewerInvitationReminder`, `ReviewDueReminder`, `ReviewOverdue` | reviewer                                                                | scheduler                                              |
| `InvitationResponded`                                              | inviting admin or handling editor, otherwise all admins                 | accept, decline, expire                                |
| `ReviewSubmitted`                                                  | admins                                                                  | review submitted                                       |
| `ReviewAssignmentClosed`                                           | reviewers with open assignments                                         | decision, withdrawal, cancellation                     |
| `DecisionLetter`                                                   | submitter (cc corresponding, TO CONFIRM)                                | any decision; the body is the stored letter            |
| `RevisionReminder`                                                 | submitter                                                               | scheduler                                              |
| `NewMessage`                                                       | the other side of the channel                                           | message; at most 1 per thread per 15 min (delayed job) |
| `WithdrawalRequested`                                              | admins                                                                  | author request                                         |
| `PaymentRecorded`                                                  | submitter, if `apc.show_to_author`                                      | paid or waived                                         |
| `ProofReady`, `ManuscriptPublished`                                | corresponding author / authors                                          | production                                             |
| `RoleGranted`                                                      | user                                                                    | admin grants a role                                    |
| `LoginLinkNotification` (optional)                                 | user                                                                    | sign-in link requested                                 |

**Operations**: DEPLOY.md covers SPF, DKIM and DMARC for the sending domain (Q21), the `bulletin-queue` Supervisor worker and the scheduler cron. The existing `ManuscriptSubmitted` and `SubmissionReceipt` notifications stay for the legacy form until it is removed.

---

## 12. Security and privacy

### 12.1 Policies (`app/Policies/*`, auto-discovered, explicit checks, no `Gate::before`)

- **`ManuscriptPolicy`**
    - `viewAny`: admin.
    - `view`: admin, the submitter, or a reviewer with an assignment that is accepted, submitted, or cancelled after acceptance.
    - `updateDraft`: the submitter, in `draft` or `revision_requested`.
    - `submit`, `resubmit`, `discard`, `requestWithdrawal`: the submitter, under the status rules.
    - `manage`, `decide`, `invite`, `managePayment`, `editProduction`, `withdraw`, `reopen`: an admin who is not in conflict.
    - `viewIdentities`: admin and submitter; reviewers only under `single_anonymous`.
    - `viewConfidential`: admin.
    - `viewPayment`: admin, or the submitter when `apc.show_to_author` is set.
- **`ReviewAssignmentPolicy`**: `respond` for the token holder or the matching user; `review` for `reviewer_id === user` while the assignment is accepted; `manage` for an admin.
- **`ManuscriptFilePolicy::download`**: the role × visibility × version matrix. A reviewer gets files only from the versions assigned to them, plus their own uploads.
- **`ManuscriptMessagePolicy`**: by channel membership. Authors never read the `editorial` or `reviewer` channels.

### 12.2 Visibility matrix

| Data                                                                      | Admin | Author (submitter)                               | Reviewer (assigned)                            |
| ------------------------------------------------------------------------- | ----- | ------------------------------------------------ | ---------------------------------------------- |
| Body, references                                                          | ✓     | ✓                                                | ✓ (frozen version)                             |
| Authors, affiliations, acknowledgements, funding                          | ✓     | ✓                                                | single: names and affiliations only; double: ✗ |
| Contacts, `submission_data` (declarations, referees, cover letter, forms) | ✓     | ✓                                                | ✗                                              |
| Reviewer identities                                                       | ✓     | ✗ ("Reviewer N" only)                            | ✗ (others)                                     |
| Comments to author                                                        | ✓     | through the decision letter / after the decision | own; others only by config                     |
| Confidential to editor, recommendation                                    | ✓     | ✗                                                | own                                            |
| Editorial channel                                                         | ✓     | ✗                                                | ✗                                              |
| Payment                                                                   | ✓     | own status (config)                              | ✗                                              |
| History                                                                   | full  | reduced                                          | own assignment                                 |

### 12.3 Presenters and anonymity

- Every Inertia prop is built by a presenter: `App\Manuscripts\Presenters\ManuscriptPresenter::{forAdmin, forAuthor, forReviewer}`, `AssignmentPresenter`, `FilePresenter` (anonymised `display_name`) and `EventPresenter`. Controllers never pass `->toArray()` from a model.
- `App\Manuscripts\Anonymity\Redactor` removes identities from the reviewer view, the reviewer HTML and the review PDF according to `journal.review.anonymity`.
- **File metadata**:
    - For `.docx`, `.xlsx` and `.pptx` uploaded by reviewers, or by authors under double-anonymous review, `ZipArchive` rewrites `docProps/core.xml` and `app.xml` to blank creator, lastModifiedBy and company.
    - PDFs get a warning. Stripping them needs `qpdf` or `exiftool` on the server (Q13).
- **Leak tests** (§14): the serialised props, HTML, PDF-HTML, file names and mail headers are scanned for names and e-mails that must not be there.

### 12.4 Files

- Files live on the private `local` disk under `manuscripts/{id}/{kind}/{uuid}.{ext}`, with the extension guessed from the content (the existing `storeFile` and `safeFileName` pattern).
- Uploads are validated with `extensions:` + `mimes:` and the content is re-sniffed with `finfo`. The SHA-256 is stored. Size limits per kind come from config, within the 21 MB limit in `deploy/php.ini`.
- **Allowed types**:
    - figures: PNG and JPEG;
    - supplementary and attachments: PDF, DOCX, DOC, ODT, XLSX, CSV, ZIP, PNG and JPEG (TO CONFIRM);
    - **no SVG and no HTML.**
- **Download route**: `GET files/{file}` (`auth`, `verified`, `can:download,file`, `throttle:120,1`).
    - Headers: `Cache-Control: private, no-store`, `nosniff`, `X-Robots-Tag: noindex` and `Content-Disposition: attachment; filename="{display_name}"`.
    - `?inline=1` is allowed only for PNG, JPEG and PDF.
    - **Signed URLs are not accepted on this route.**
- Legacy signed links (`submissions.file`) stay only for the old editor e-mails.

### 12.5 Other measures

- **Session and CSRF**:
    - invitation routes use `signed`, so they have a session;
    - register and login are Fortify `guest`;
    - everything else is `auth`, so `StatelessPublicRequests` and `PublicCache` never touch the back-office (a test asserts it is never `public`).
    - `session()->regenerate()` runs after an invitation creates or logs in a user.
- **`password.confirm`** protects role changes, deactivation, reopen and payment reverts.
- **Rate limits**: register 5 per hour per IP; invitation GET and POST 30 per minute; invites 30 per hour per admin; autosave 120 per minute; uploads 30 per minute; messages 20 per minute; Crossref 30 per minute; login link 3 per 10 minutes.
- **XSS**: rich content is rendered only on the server from allowlisted JSON and then sanitised. Messages are plain text. Math SVG goes through its own allowlist.
- **IDOR**: ULID route keys and policies on every route. A test matrix checks guest, wrong role and another user's manuscript.
- **No CSP exists today**: add no inline scripts, and self-host the KaTeX CSS.
- **Audit**: append-only events and triggers; users with history can only be deactivated; FKs restrict deletion. Optional (release 5): a `hash` chain on events verified by `journal:audit-verify`.
- **Backups**: `deploy/backup.sh` already archives `storage/app/private` (which includes `manuscripts/`) and the SQLite file.
- **GDPR**:
    - update the privacy page (accounts, review data, retention);
    - `journal.retention.rejected_files_years` (null keeps files; TO CONFIRM). A prune deletes the files of rejected and withdrawn manuscripts but keeps metadata and events, and logs an event.

---

## 13. Pages and routes

### 13.1 Route files

- **New**: `routes/backoffice.php`, which requires `routes/backoffice/{author,reviewer,admin,shared}.php`.
- **`routes/web.php`** gets one `require` line, and the old `dashboard` redirect and `admin/submissions` group move into the new files. Both are minimal edits to the foundation-owned file, so flag them to the lead.
- **Collisions**: the paths `dashboard`, `author/…`, `reviewer/…`, `admin/…`, `manuscripts/…`, `invitations/…`, `files/…` and `login/link` collide neither with `PageController::PATHS` (`editorial|editorial-board|submit-your-paper|guidelines…`) nor with the legacy `{post}` regex (`volume-…|\d+-supp-\d+|\d+_\d+_\d+-…`).
- **Legacy export**: `routes/submissions.php` moves `admin/submissions/export` under `role:admin`.
- **After adding routes**, run `php artisan wayfinder:generate` before `tsc`.

| Method and URI                                                                                              | Name                        | Middleware                            | Controller / page                                           |
| ----------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| GET `dashboard`                                                                                             | dashboard                   | auth, verified                        | `DashboardController` → `dashboard`                         |
| GET/POST `register`                                                                                         | Fortify                     | guest, ThrottleRegistration           | `auth/register`                                             |
| POST `login/link`, GET `login/link/{user}`                                                                  | login.link.*                | guest / guest+signed                  | `LoginLinkController` (optional)                            |
| GET `invitations/{assignment}/{token}`                                                                      | invitations.show            | signed, throttle:30,1                 | `InvitationController@show` → `auth/invitation`             |
| POST `invitations/{assignment}/{token}/accept` · `/decline` · `/register`                                   | invitations.*               | signed, throttle (`register`: +guest) | `@accept`, `@decline`, `@register`                          |
| GET `files/{file}`                                                                                          | files.show                  | auth, verified, can, throttle:120,1   | `ManuscriptFileController`                                  |
| GET `manuscripts/{manuscript}/compare`                                                                      | manuscripts.compare         | auth, verified, can:view              | `CompareController` → `manuscripts/compare`                 |
| GET `manuscripts/{manuscript}/preview/{version?}`                                                           | manuscripts.preview         | auth, verified, can:view              | `PreviewController` → `manuscripts/preview`                 |
| **Author** (prefix `author`, name `author.`)                                                                |                             | auth, verified, role:author           |                                                             |
| GET `author/manuscripts`                                                                                    | .manuscripts.index          |                                       | `Author\ManuscriptController@index`                         |
| POST `author/manuscripts`                                                                                   | .manuscripts.store          |                                       | create a draft (type, language) with its skeleton           |
| GET `author/manuscripts/{m}`                                                                                | .manuscripts.show           | can:view                              | `@show`                                                     |
| GET `author/manuscripts/{m}/edit`                                                                           | .manuscripts.edit           | can:updateDraft                       | `@edit`                                                     |
| PATCH `author/manuscripts/{m}/draft`                                                                        | .manuscripts.draft          | throttle:120,1                        | `DraftController@update` (JSON)                             |
| GET `author/manuscripts/{m}/check`                                                                          | .manuscripts.check          |                                       | `CheckController` (JSON)                                    |
| POST `author/manuscripts/{m}/render`                                                                        | .manuscripts.render         | throttle:60,1                         | live preview HTML (JSON)                                    |
| POST `author/manuscripts/{m}/proof`                                                                         | .manuscripts.proof          | throttle:10,1                         | queue a PDF proof                                           |
| POST / DELETE `author/manuscripts/{m}/files[/{file}]`                                                       | .manuscripts.files.*        | throttle:30,1                         | `Author\FileController`                                     |
| GET / POST `author/manuscripts/{m}/submit`                                                                  | .manuscripts.submit         |                                       | `SubmitController` (`submit` or `resubmit` by status)       |
| POST `author/manuscripts/{m}/withdrawal`                                                                    | .manuscripts.withdrawal     |                                       | `@requestWithdrawal`                                        |
| POST `author/manuscripts/{m}/messages`                                                                      | .manuscripts.messages.store | throttle:20,1                         | `MessageController@store`                                   |
| DELETE `author/manuscripts/{m}`                                                                             | .manuscripts.destroy        |                                       | discard a never-submitted draft                             |
| GET `author/references/lookup`                                                                              | .references.lookup          | throttle:30,1                         | `ReferenceLookupController` (Crossref)                      |
| **Reviewer** (prefix `reviewer`, name `reviewer.`)                                                          |                             | auth, verified, role:reviewer         |                                                             |
| GET `reviewer/reviews`                                                                                      | .reviews.index              |                                       | `Reviewer\ReviewController@index`                           |
| GET `reviewer/reviews/{assignment}`                                                                         | .reviews.show               | can:review                            | `@show`                                                     |
| PATCH `reviewer/reviews/{assignment}/review`                                                                | .reviews.save               | throttle:120,1                        | autosave                                                    |
| POST `reviewer/reviews/{assignment}/submit` · `/files` · `/messages` · `/withdraw`                          | .reviews.*                  |                                       | submit, upload, message, "can't complete"                   |
| **Admin** (prefix `admin`, name `admin.`)                                                                   |                             | auth, verified, role:admin, admin.2fa |                                                             |
| GET `admin`                                                                                                 | .index                      |                                       | `Admin\DeskController`                                      |
| GET `admin/manuscripts` (+ `/export`)                                                                       | .manuscripts.*              |                                       | `Admin\ManuscriptController`                                |
| GET `admin/manuscripts/{m}`                                                                                 | .manuscripts.show           |                                       | `?tab=`                                                     |
| GET `admin/manuscripts/{m}/decisions/draft?type=`                                                           | .decisions.draft            |                                       | pre-filled letter                                           |
| POST `admin/manuscripts/{m}/decisions`                                                                      | .decisions.store            |                                       | `Admin\DecisionController`                                  |
| POST `admin/manuscripts/{m}/transitions/{action}`                                                           | .transitions                | `reopen`: password.confirm            | send_to_review, start_production, withdraw, reopen, publish |
| POST `admin/manuscripts/{m}/invitations`                                                                    | .invitations.store          | throttle:30,60                        | `Admin\ReviewerAssignmentController@store`                  |
| PATCH `admin/assignments/{a}`; POST `…/{remind,cancel,unlock,regenerate}`                                   | .assignments.*              |                                       | assignment actions                                          |
| PUT `admin/manuscripts/{m}/payment`                                                                         | .payment.update             | revert: password.confirm              | `Admin\PaymentController`                                   |
| PUT `admin/manuscripts/{m}/production`                                                                      | .production.update          |                                       | volume, issue, pages, DOI                                   |
| PATCH `admin/manuscripts/{m}/metadata`; POST `/files`, `/messages`, `/pdf/{variant}`                        | …                           |                                       | corrections, uploads, messages, PDFs                        |
| GET `admin/payments` (+ export), `admin/authors`, `admin/authors/{user}`, `admin/reviewers`, `admin/emails` | …                           |                                       | report pages                                                |
| GET `admin/users`, `admin/users/{user}`; PUT `…/roles`; POST `…/deactivate`                                 | .users.*                    | roles, deactivate: password.confirm   | `Admin\UserController`                                      |
| GET `admin/submissions` (+ export); POST `admin/submissions/{submission}/import`                            | .submissions.*              |                                       | legacy list + `LegacyImportController`                      |

### 13.2 Frontend

**Pages**

- `pages/dashboard.tsx`
- `pages/auth/{register,invitation,invitation-invalid}.tsx`. They get AuthLayout automatically through the `auth/` prefix.
- `pages/author/manuscripts/{index,edit,submit,show}.tsx`
- `pages/reviewer/reviews/{index,show}.tsx`
- `pages/manuscripts/{compare,preview}.tsx`
- `pages/admin/index.tsx`, `pages/admin/manuscripts/{index,show}.tsx`, `pages/admin/{payments,reviewers,emails}/index.tsx`, `pages/admin/authors/{index,show}.tsx`, `pages/admin/users/{index,show}.tsx`

**Components** (`resources/js/components/manuscript/`)

- `editor/`:
    - `section-editor.tsx`, `inline-editor.tsx`, `toolbar.tsx`, `symbol-palette.tsx`
    - `table-block/*`, `figure-block.tsx`, `equation-block.tsx`, `citation-node.tsx`, `xref-node.tsx`, `footnote-node.tsx`
    - `extensions/*`, `paste/{word,table}.ts`, `numbering.ts`, `autosave.ts`
- `front-matter/`: `authors-editor.tsx`, `affiliations-editor.tsx`, `keyword-chips.tsx`, `summary-editor.tsx`, `end-matter.tsx`, `declarations.tsx`
- `references-panel.tsx`, `citation-picker.tsx`, `checker-panel.tsx`, `outline.tsx`, `manuscript-frame.tsx`, `version-diff.tsx`, `event-timeline.tsx`
- `status-badge.tsx`, `payment-badge.tsx`, `file-list.tsx`, `file-upload.tsx`, `message-thread.tsx`
- `review-form.tsx`, `decision-dialog.tsx`, `invite-reviewers-dialog.tsx`, `payment-dialog.tsx`

**Library code**: `lib/manuscript/{labels,citations,schema}.ts` and `lib/dates.ts` (the `useDate()` helper moved here).

**Layout**: `layouts/editor-layout.tsx`.

**Shell**

- `isLightOnly` in `app.tsx` and `app.blade.php` is extended to `admin/`, `author/`, `reviewer/`, `manuscripts/` and `dashboard`. Appearance is removed from the back-office settings navigation.
- `components/app-sidebar.tsx` is rewritten with one group per role held, all through `t()`:
    - **My work**: My manuscripts, New manuscript
    - **Reviewing**: My reviews (with a badge count)
    - **Editorial office**: Desk, Manuscripts, Payments, Authors, Reviewers, Users, E-mail log, Legacy submissions
- The sidebar footer has Instructions for authors, Public site and "Design & development: Nexsol Labs" (`https://nexsollabs.com`). The GitHub and Docs links are removed. `NavMain` takes a group label prop. `app-logo` uses LogoMark.
- The public `components/journal/site-header.tsx` gets a discreet "Sign in" / "My account" link.

---

## 14. Testing

**Conventions**: PHPUnit 12 classes, `RefreshDatabase`, `assertInertia`, `Notification::fake()`, `Storage::fake('local')`, `Queue::fake()` for PDF jobs and `$this->travelTo()` for deadlines.

**Existing tests to rewrite deliberately**

- `Auth/RegistrationTest`: registration creates an author; verification is required; honeypot; throttle; ORCID checksum; locale stored.
- `PlatformTest::test_auth_surface_is_restricted`: `/register` returns 200 for guests and `fortify.home === '/dashboard'`.
- `PlatformTest::test_editor_accounts_are_created_from_the_console`: asserts the admin role.
- `DashboardTest`: role-aware landing; an author or a user without a role gets 403 on `/admin/*`.
- `SubmissionTest`: the existing 18 tests run with `journal.guest_submissions = true`, plus a test for the switched-off state.

**New feature tests (`tests/Feature/Backoffice/*`)**

- `RolesTest`: grant and revoke; last-admin guard; `role` middleware; deactivated users rejected; the explicit `auth.user` share has no `phone`.
- `AdminTwoFactorTest`.
- `InvitationTest`:
    - the signed link starts a session and the POST is not a 419;
    - invalid, used and expired tokens; resend rotates the token;
    - accept as a new user (verified, logged in, reviewer role); accept as an existing user (login handoff); accept under a different account (event with both e-mails);
    - decline without an account; COI required;
    - the abstract is shown without the body; double-anonymous hides authors.
- `ManuscriptDraftTest`: skeleton per type; autosave; 409 on a stale lock; 422 on unknown node, oversize or too deep; 423 after submit.
- `SubmitTest`: checker errors block; v1 frozen with a hash; the reference is assigned once and continues after legacy numbers; contributors projected; notifications after commit.
- `WorkflowTransitionsTest`: a data provider over **every status × action × role**. Allowed pairs write exactly one event; the rest throw. A compare-and-set conflict gives 409. A grep guard checks that nothing outside the service writes `status`.
- `ReviewTest`: autosave, submit and lock, unlock, file visibility, "can't complete".
- `RevisionRoundTest`: revision → resubmit with the required response → round 2 re-invite, with reviewer ordinals kept; a technical return needs no response.
- `DecisionTest`: confidential comments are never in the letter; the stored letter equals the sent one; an override needs a reason; accept snapshots the APC and sets `unpaid`; open assignments are cancelled; a COI admin is blocked.
- `PaymentTest`: admin only; before and after recorded in the event; reverting needs a note; author visibility follows config; production and publication gates.
- `AuthorizationMatrixTest`: every back-office route × {guest, author, reviewer, admin, multi-role, another user's manuscript} gives the expected status.
- `AnonymityTest`, in both modes:
    - author props (`X-Inertia` JSON), e-mails, file names and mail headers contain no reviewer name or e-mail;
    - double-anonymous reviewer props, rendered HTML and review-PDF HTML contain no author name, e-mail or `submission_data`;
    - docx metadata is scrubbed.
- `FileAccessTest`: kind × visibility × role matrix; response headers; signed URLs are refused on `files/{file}`.
- `AuditImmutabilityTest`: Eloquent update and delete throw, and raw queries hit the trigger, for events, decisions and versions.
- `RemindersTest`: time travel; each reminder is sent once; events and `mail_log` rows are written; invitations expire.
- `AccountDeletionTest`, `LegacyImportTest`, `CacheHeadersTest` (never `public`), `LocaleMailTest` (a user with `mk` gets Macedonian mail), `EmailLogTest`.

**Unit tests (`tests/Unit/Manuscripts/*`)**

- `ContentValidatorTest`
- `ManuscriptCheckerTest`, one test per issue code
- `ManuscriptRendererTest`: golden HTML in `tests/fixtures/render/*.html`, covering booktabs with colspan, rowspan and group rows, captions, lettered notes, numbering by first cross-reference, appendix A.1, escaping (`<script>` in text stays escaped) and anonymised output
- `HarvardFormatterTest` and `CitationLabelerTest`: the IFA and PDF fixtures, a/b suffixes, group sorting, "and" versus "et al."
- `NumberingTest`, `VersionComparerTest`, `ManuscriptStatusTest`, `EnumMirrorTest`, `MathSvgSanitizerTest`

**Shared fixtures**: `tests/fixtures/manuscripts/71_2_001.json` (the template paper rebuilt in the schema, with Table 2's group rows, seven-author references and the Резиме) and `original-paper.json` (merged-cell table, figure, footnotes, equation). They feed the renderer, checker and PDF tests and `ManuscriptDemoSeeder`. A Node script loads every fixture with `Node.fromJSON` in the TipTap schema, so the client and server schemas cannot drift.

**PDF**: `PdfSmokeTest` is skipped unless the `weasyprint` binary is present. It checks the page count, embedded fonts (`pdffonts`), the start page in proof mode, and that `pdftotext` finds "Резиме", "Table 1." and the running head.

**Frontend**: `vp test` (Vitest, if vite-plus 1.4 provides it; otherwise `node --test`) covers `paste/word.ts`, `paste/table.ts`, `numbering.ts`, `citations.ts` and the diff aligner. `docs/qa-backoffice.md` holds a manual end-to-end script for each role, in EN and MK, at desktop and phone width.

**Gates**: `composer ci:check` (vp check, tsc, pint, larastan level 7, tests) **plus `npm run i18n:check`, added to `ci:check`**. PHP 8.3 syntax only, because local PHP is 8.5.

---

## 15. Phases and milestones

The effort assumes one full-stack developer plus part-time review. Every release is tested, deployable and demoable.

**Release 0: spikes (week 1, in parallel with release 1)**

| Spike                  | Must show                                                                                                                                                                                                | Exit                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| S1 Editor tables (2 d) | TipTap v3 TableKit with merge and split, group row, column alignment, booktabs CSS in the editor, Word and Excel paste, UniqueID, React Compiler on, SSR safe                                            | 71_2_001 Table 2 and 71_2_008 Table 1 (spanning headers) are built and round-trip to JSON                    |
| S2 PDF (2 d)           | WeasyPrint ≥ 69 rebuilds pp. 1–2 and one table page of 71_2_001 in one column: start page 3, mirrored running heads, "*email" footnote, repeated `thead`, Cyrillic Резиме in Liberation Serif, ¶ numbers | **Pass: adopt WeasyPrint. Fail: Chromium + Paged.js behind `PdfEngine`.** The owner signs off a sample page. |
| S3 Math (0.5 d)        | `mathjax-full` produces SVG in Node, and it is sanitised and embedded in WeasyPrint output                                                                                                               | Decides whether equations ship in release 5                                                                  |

The open questions (§17) go to the editors this week.

**Release 1: accounts and roles (1 week)**

- **Data and roles**: migrations for users, user_roles and user_events; the role enum and middleware; admin 2FA; the explicit auth share; `HasLocalePreference`.
- **Sign-up and sign-in**: the register page and action, the throttle, and new auth copy.
- **Admins**: one `journal:editor` command (the duplicate deleted); `/admin/users`.
- **Shell**: the role-aware `/dashboard` and sidebar with the Nexsol credit; the light-only back-office; legacy `/admin/submissions` under `role:admin`.
- **Profile and housekeeping**: profile fields; deactivation and the deletion guard; Macedonian keys; rewritten tests.
- **Demo**: an author registers, verifies and signs in. An admin promotes a user to reviewer. A non-admin gets 403 on `/admin`.

**Release 2: workflow with uploaded manuscripts (3 weeks)**

- **Domain**: all manuscript, review and audit migrations, with triggers; models, enums and factories; `ManuscriptWorkflow` and `ReviewWorkflow`; events; `mail_log`; policies and presenters; files with the download controller.
- **Authoring**: the author wizard with structured front matter, authors and affiliations, abstract, keywords, summary, declarations, referees and forms, with **the body as an uploaded file**. Autosave, the checker, submit and resubmit, version freeze.
- **Review**: the admin desk, list and detail; invitations (signed token flow, COI, account handoff); the reviewer workspace (recommendation, comments to author, confidential note, files, messages); decision letters; the revision loop with the response letter and rounds.
- **Payments and people**: the payment panel, the payments report and the per-author view.
- **History and mail**: the event timeline; the mail theme; notifications; the reminders scheduler.
- **Legacy**: legacy import; the public form switched to account sign-up behind `guest_submissions`.
- **Demo**: a full cycle on a real paper (submit → 2 reviewers → major revision → resubmit → accept → mark paid), with complete history, in EN and MK. **The editorial office can start using the system here.**

**Release 3: the template editor (4 weeks)**

- `config/manuscript.php` and the content validator.
- The paper-like editor page: inline title and abstract editors, section editors with skeletons per type and variants, booktabs tables (from S1), figures, footnotes, cross-references, numbering, symbol palette and Word paste.
- Structured references with `HarvardFormatter`, citations, Crossref lookup and the "link citations" tool.
- The PHP renderer, `manuscript.css`, the live preview, and the browser "Print / Save as PDF" with `manuscript-print.css`.
- The checker extended to the body. `source = editor` becomes the default and upload becomes admin-only.
- **Demo**: an author rebuilds 71_2_001 in the app; the preview matches the journal in one column with booktabs tables; the paper is submitted and reviewed.

**Release 4: track changes and server PDFs (2 weeks)**

- `VersionComparer` and the compare page for authors, reviewers (round 2 and later) and admins; the response letter shown beside the diff.
- `WeasyPrintEngine` and `GenerateVersionPdfs`: the submission, review (¶ numbers, anonymised), accepted and proof variants.
- Fonts and DEPLOY.md (WeasyPrint through pipx, Pango, scheduler, queue, SPF and DKIM); the e-mail log UI.
- **Demo**: a v1 ↔ v2 diff with table cell changes; an anonymised review PDF; a proof that matches 71_2_001 in one column with start page 3.

**Release 5: production and polish (2–3 weeks; items can be picked separately)**

- Publishing to the archive: create or link an `Article` in an `Issue`, assign the DOI, attach the final PDF, and show it on the public site.
- Equations (S3), appendices and the abbreviations footnote.
- "Import from Word" with mammoth.js (approximate).
- The optional sign-in link.
- Admin-editable letter templates.
- DOCX export through pandoc, if typesetting stays in Word (Q10).
- The optional audit hash chain and retention pruning.
- An accessibility pass to WCAG 2.2 AA (keyboard use in the editor, focus, contrast); short help pages per role; the updated IFA page text.
- **Milestone**: the editors sign off after a pilot with 2–3 real manuscripts, followed by production launch.

**Total**: about 12–14 weeks. Releases 1 and 2 (about 4 weeks) already deliver login, the three roles, submission, reviewer invitations, decisions, history and payments.

---

## 16. Risks

| Risk                                                            | Mitigation                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merged cells in TipTap tables are awkward for authors           | Spike S1. A limited feature set: no column resize, no nested content. If inline editing frustrates users, fall back to an "Edit table" dialog.      |
| PDF fidelity (page-counter offset, footnotes, repeated headers) | Spike S2 before release 4 is committed. The `PdfEngine` interface. The browser-print fallback already exists in release 3.                          |
| Client and server schema drift                                  | Shared JSON fixtures tested in PHP and Node. A `schema` version field with migrators. A single allowlist feeds both the validator and the renderer. |
| Anonymity leaks (props, files, mail headers, PDF metadata)      | Presenters only, `AnonymityTest`, a structural split (`submission_data`), file renaming and docx scrubbing.                                         |
| Invitations not delivered (queue down, SPF)                     | `mail_log`, the queue-health line on the desk, Supervisor monitoring and DNS steps in DEPLOY.md.                                                    |
| Scope creep and owner timeline                                  | Workflow before the editor. Production stays one `in_production` stage. Annotations and suggestion mode are excluded or deferred.                   |
| React Compiler or SSR conflicts with ProseMirror                | Client-only lazy mount, `immediatelyRender: false`, `'use no memo'` escape hatch. Covered by S1.                                                    |
| SQLite write contention from autosave                           | WAL is already on, saves are debounced and small, and volume is low (2 issues a year).                                                              |
| Journal facts unconfirmed (APC, review model, labels)           | Everything is in config marked TO CONFIRM, with safe defaults (double-anonymous, soft limits, the APC does not gate production).                    |
| Admin is also an author in a small office                       | The COI guard is configurable; Q12 asks whether there is a second admin.                                                                            |

---

## 17. Open questions for the editorial office

Each question shows the default used until it is answered. All answers go into `config/journal.php` or `config/manuscript.php`.

1. **Review model**: single-anonymous or double-anonymous? The site says "blind" in one place and "double-blind" in another, and DOAJ says single. _Default: double-anonymous._
2. **APC**:
    - Is the 50 EUR fee "on acceptance" still charged? DOAJ says there is no APC.
    - Which currency, are waivers possible, and does payment have to come before production or publication?
    - Who issues invoices and in what reference format? Should authors see their payment status and get a receipt?
    - _Default: enabled at 50 EUR; it does not gate anything; authors see their status._
3. **Article types**: are mini-review, case study or report, and "other contributions" offered? What are their Macedonian labels (only "Стручен труд" is confirmed)?
4. **Limits**: what is the abstract limit for reviews? Are limits hard or soft? Are there limits for the summary? _Default: 250 words, soft._
5. **Headings**:
    - English: "Material" or "Materials and methods"? "Conclusion" or "Conclusions"? "Acknowledgement" or "Acknowledgements"? How should "Results and discussion" be capitalised?
    - Macedonian labels not yet seen in print: methods, results, acknowledgements, and "Примено" / "Прифатено" for Received / Accepted.
6. **Statements**: are Conflict of interest, Funding, Ethics, Data availability and AI use printed, and where? Is the default wording approved?
7. **Suggested referees**: are exactly 3 mandatory? Should opposed reviewers be allowed?
8. **Reviewer recommendations**: Accept / Minor / Major / Reject, or only Accept / Revise / Decline? Are structured questions wanted? Should reviewers see the decision and the other (anonymised) reviews?
9. **Deadlines**: reviewer response 7 days, review 21 days, revision 30 days (IFA), and the reminder cadence?
10. **Print and production**:
    - Page and text block: keep the 205.2 × 287.2 mm trim, or A4? A 160 mm text block with a 10.5 pt body, or 176 mm?
    - Fonts and tables: Liberation Serif or STIX Two? Bold or regular table headers? Centred numeric columns? Table footnote markers as letters (IFA) or "*"? The wording of "(continued)"?
    - Printing: print the licence line and the corresponding author's phone?
    - Production: will the app's PDF become the official galley, or does typesetting stay in Word (which makes DOCX export a priority)?
11. **Style**: decimal comma in Macedonian text? Superscript in Δ⁹? Italic _n_? Update the "86/609/EEC" wording to 2010/63/EU?
12. **Editorial roles**: is one admin role enough, or are Editor-in-Chief, handling editor and secretary roles needed? Who decides on a paper submitted by an editor? Is there a second admin?
13. **Files**: may we install `qpdf` or `exiftool` on the server to strip PDF metadata? Which supplementary file types are allowed?
14. **Co-authors**: may co-authors edit the draft or follow its status? Should they be notified on submission? Should decision letters CC every corresponding author?
15. **Forms**: are the Author Disclosure and Ethical Responsibility forms still required as signed uploads, or replaced by in-app declarations?
16. **Retention**: how long are files of rejected or withdrawn manuscripts kept? What text should the updated privacy notice contain?
17. **Licence**: CC BY 3.0 or 4.0? What licence or copyright agreement text is shown at submission?
18. **Launch**: when should the public upload form be switched off, and what is the new IFA wording for the submission paragraph?
19. **Password policy**: keep the current strict rules (12 characters, mixed case, symbols, breach check), or relax them to 12 characters, letters, numbers and the breach check, while promoting passkeys? Should reviewers be offered an e-mailed sign-in link?
20. **"Received" date**: is it the date of first submission, or the date after the technical check?
21. **Sending address** for system mail (for example `no-reply@…`), and who controls DNS for SPF, DKIM and DMARC?
22. **Terminology**: please confirm the Macedonian UI terms: Ракопис, Рецензент, Уредништво, Нацрт, Во рецензија, Побарана ревизија, Прифатен, Одбиен, Повлечен, Платено/Неплатено/Ослободен, Доверливи коментари до уредникот.
