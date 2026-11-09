# Back-office codebase map: Macedonian Pharmaceutical Bulletin (`/Users/sasho/Sites/bilten_farmacija`)

I only read files. Nothing was modified.

## 1. Fortify: config and provider

**What exists**

- `config/fortify.php`:
    - `'home' => '/admin/submissions'`, `'views' => true`, `'middleware' => ['web']`, `lowercase_usernames => true`.
    - Features: `resetPasswords()`, `emailVerification()`, `twoFactorAuthentication(['confirm'=>true,'confirmPassword'=>true])` and `passkeys(['confirmPassword'=>true])`.
    - **`// Features::registration(),` is commented out.** The comment says "only the editorial office has accounts… Authors submit manuscripts without an account."
    - Passkeys block: `relying_party_id` comes from the `APP_URL` host and `allowed_origins => [config('app.url')]`.
- `app/Providers/FortifyServiceProvider.php`:
    - `createUsersUsing(CreateNewUser)` and `resetUserPasswordsUsing(ResetUserPassword)`.
    - Every view is `Inertia::render('auth/...')`: login (`canResetPassword`, `status`), reset-password, forgot-password, verify-email, two-factor-challenge, confirm-password.
    - **`registerView` renders `auth/register`, but `resources/js/pages/auth/register.tsx` does not exist** (it was deleted).
    - Rate limiters: `login` 5/min per email+IP, `two-factor` 5/min per `login.id`, `passkeys` 10/min.
- Registered routes: login, passkeys/login(+options), two-factor-challenge, `user/confirm-password`, `user/two-factor-*`, `user/passkeys*`, email/verify, forgot/reset-password, `.well-known/passkey-endpoints` (in `routes/settings.php`). `/register` is not registered.

**Reuse as-is:** login, 2FA, passkeys, reset password, email verification and the rate limiters.

**Must change**

- Enable `Features::registration()` for AUTHORS only.
- Create `pages/auth/register.tsx`. Its form needs affiliation, ORCID (optional), country/address, phone (the instructions require corresponding-author contact details) and consent.
- Change `fortify.home` to a role-aware landing:
    - either `/dashboard` with a role redirect,
    - or a custom `LoginResponse`/`RegisterResponse`/`TwoFactorLoginResponse` bound in the provider.
- Reviewer invitations should not use public registration. Use a signed invitation link or a set-password flow (see section 3).

**Gotchas**

- Two tests assert that registration is off:
    - `tests/Feature/Auth/RegistrationTest.php` (`test_registration_is_disabled`, `test_login_page_has_no_sign_up_link`)
    - `tests/Feature/PlatformTest.php::test_auth_surface_is_restricted`, which asserts `/register` returns 404 and `fortify.home === '/admin/submissions'`.
- These must be rewritten.

## 2. User model and auth tables

**What exists**

- `app/Models/User.php`:
    - Uses attributes `#[Fillable(['name','email','password'])]` and `#[Hidden([...])]`.
    - `implements MustVerifyEmail, PasskeyUser`.
    - Traits: `HasFactory`, `Notifiable`, `PasskeyAuthenticatable`, `TwoFactorAuthenticatable`.
    - Casts: `email_verified_at`, `password` hashed, `two_factor_confirmed_at`.
    - No role, no relations.
- Migrations:
    - `0001_01_01_000000_create_users_table.php`: id, name, email unique, email_verified_at, password, remember_token, timestamps. Also creates `password_reset_tokens` and `sessions`.
    - `2025_08_14_170933_add_two_factor_columns_to_users_table.php`: two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at.
    - `2024_01_01_000000_create_passkeys_table.php`: user_id FK cascade, name, credential_id unique, credential json, last_used_at.
- `database/factories/UserFactory.php`: verified by default, plus `unverified()` and `withTwoFactor()` states. **There are no other factories** (no Submission factory).
- No `app/Policies`, no Gates, no role package. `AppServiceProvider::boot` sets:
    - `Date::use(CarbonImmutable::class)`
    - `DB::prohibitDestructiveCommands(prod)`
    - production `Password::defaults()`: min 12, mixedCase, letters, numbers, symbols, **`uncompromised()`**. That last rule makes an outbound HTTP call to HaveIBeenPwned and is strict for registering professors.
- `HandleInertiaRequests::share` sends `auth.user => $request->user()`, the whole model through toArray with hidden fields removed. **Any new column (role, phone…) is exposed to the frontend automatically** unless it is added to `Hidden`. TS type: `resources/js/types/auth.ts` `User`.

**Must change**

- Add the role. Either:
    - a `role` string column with an enum `App\Enums\Role` {admin, author, reviewer} (simplest, matches the "three roles" request), or
    - a pivot table, if one person can be both author and reviewer. That is common in journals, so a multi-role design is safer.
- Add profile fields: affiliation, title, ORCID, phone, country.
- Add policies/gates and a role middleware.
- Extend the TS `User` type.

**Gotchas**

- `CarbonImmutable` everywhere: do not mutate dates in place.
- Production password rules differ from the test environment (in tests `Password::defaults()` returns null).

## 3. Fortify actions and editor-account commands

**What exists**

- `app/Actions/Fortify/CreateNewUser.php` validates `profileRules()` + `passwordRules()` (from `app/Concerns/ProfileValidationRules.php` and `PasswordValidationRules.php`) and creates name/email/password.
- `ResetUserPassword.php` is standard.
- There are **two duplicate editor-creation commands**:
    - `app/Console/Commands/CreateEditor.php`: `journal:create-editor {email} {name}`. Prints a random 20-character password once and sets `email_verified_at`.
    - A closure in `routes/console.php`: `journal:editor {email} {--name=}`. Prompts for a 12+ character password. **This is the one DEPLOY.md §3.6 documents and the one `PlatformTest::test_editor_accounts_are_created_from_the_console` tests.**
- `routes/console.php` schedules: `queue:prune-failed`, `auth:clear-resets`, `model:prune` (runs `prunable()`) and a SQLite `PRAGMA optimize`.

**Must change**

- `CreateNewUser` must assign `role=author` and validate the new fields.
- Both commands must assign `role=admin`. Keep them consistent, or drop one and update DEPLOY.md and the test.
- Reviewer invitation needs a new path:
    - create the user with a random password and `email_verified_at=now()` (the invite e-mail proves ownership), and
    - e-mail either a Fortify password-reset token link or a signed "accept invitation / set password" route.
- An existing user who gets invited as a reviewer should get the reviewer role added, not a duplicate account.

## 4. Frontend auth pages (`resources/js/pages/auth/*`)

**What exists:** `login.tsx` (139 lines), `forgot-password.tsx`, `reset-password.tsx`, `two-factor-challenge.tsx`, `verify-email.tsx` and `confirm-password.tsx`.

- They use Inertia `<Form {...store.form()}>` with Wayfinder routes (`@/routes/login`, `@/routes/password`) and shadcn `Input`/`Label`/`Checkbox`/`Button`/`Spinner`, plus `PasswordInput`, `PasskeyVerify` and `InputError`.
- Each page sets `Page.layout = { title, description }` as English keys. `AuthLayout` translates them with `t()`.

**Reuse:** all of them, with wording changes.

**Must change**

- The copy is editor-only:
    - login description "…of your editor account."
    - reset-password "Choose a new password for your editor account."
    - forgot-password "Enter the e-mail address of your editor account…"
- Add `register.tsx`, plus a "Create an account" link on login (this breaks `test_login_page_has_no_sign_up_link`).
- Add an invitation-accept page.
- Update the mk.ts keys for all of the above.

## 5. Layouts (`resources/js/layouts/*`) and page resolution

**What exists**

- `app.tsx` picks the default layout from the component-name prefix (code-split):
    - `journal/*` → `journal-layout`
    - `auth/*` → `auth-layout`
    - `settings/*` → `[app-layout, settings/layout]`
    - **everything else** → `app-layout`, so `admin/*` and any new `author/*` and `reviewer/*` pages get the sidebar app automatically.
    - Pages in `journal/` and `auth/` are forced light (`isLightOnly`). Other pages follow the appearance cookie (dark mode possible).
    - The document title is "{page} – {journal name}", localized.
- `layouts/auth-layout.tsx`:
    - 400px card on `bg-mist`, LogoMark and bilingual journal name.
    - Overrides `journalTokens` (shadcn tokens mapped to the journal palette).
    - Eyebrow **"Editorial office sign-in"** and footnote **"Accounts are for the editorial office only. Authors submit manuscripts without an account."** linking to Submit manuscript.
    - Footer credit "Design & development: Nexsol Labs" (`https://nexsollabs.com`). Keep it.
- `layouts/app-layout.tsx` uses `app/app-sidebar-layout.tsx`, which composes `AppShell`, `AppSidebar` and `AppSidebarHeader` (breadcrumbs). `app/app-header-layout.tsx` exists but is unused.
- `components/app-sidebar.tsx` **is still the starter kit**:
    - one "Dashboard" item,
    - footer links "Repository" (github laravel/react-starter-kit) and "Documentation" (laravel.com),
    - `NavMain` group label hard-coded "Platform",
    - no `t()` in `app-sidebar` or `nav-main`.
    - `components/app-logo.tsx` / `app-logo-icon.tsx`: not checked whether they are journal-branded.
- `layouts/settings/layout.tsx`: Profile / Security / Appearance; "Settings" headings are mostly untranslated.
- `layouts/journal-layout.tsx`: public site. `components/journal/site-header.tsx` has **no sign-in or account link**.

**Must change**

- Rebuild `AppSidebar` with role-based nav, all through `t()`:
    - Admin: Manuscripts, Reviewers, Users, Payments.
    - Author: My manuscripts, New manuscript.
    - Reviewer: My reviews.
- Remove the starter-kit footer links and add the Nexsol credit.
- Rewrite the AuthLayout eyebrow and footnote for three roles.
- Possibly add "Sign in / My account" to the public header or footer.

**Gotcha:** the admin page wraps itself in `bg-white text-ink` because "the journal palette is light-only". Pick one approach for the back-office: light-only journal tokens like AuthLayout, or real dark-mode support.

## 6. Settings (`pages/settings/*`, `routes/settings.php`, `app/Http/Controllers/Settings/*`)

**What exists**

- `profile.tsx`, `security.tsx` (2FA, passkeys, password; behind `RequirePassword`) and `appearance.tsx`.
- `ProfileController::destroy` lets **any user delete their own account** (`auth` + `verified`).
- Changing email in `update` nulls `email_verified_at`.
- Routes:
    - `auth`: GET/PATCH `settings/profile`
    - `auth` + `verified`: DELETE profile, `settings/security` (+ `RequirePassword`), PUT `settings/password` (throttle 6,1), `settings/appearance`

**Reuse:** security (2FA and passkeys) and password, as-is.

**Must change**

- Add the new profile fields to the profile page and `ProfileUpdateRequest`.
- **Block or soft-delete account deletion for users who have manuscripts or reviews.** Otherwise a FK cascade or null-on-delete destroys the audit trail. `submissions.user_id` is currently `nullOnDelete`.
- Translate the settings strings.

## 7. Existing submission pipeline (build on it or replace it)

**What exists**

- `app/Models/Submission.php`:
    - Represents a public form upload with the author denormalized (`name`, `email`, `affiliation`, `title`, `type`, `message`, `suggested_reviewers`).
    - One manuscript file (`file_path/name/size`) plus a `forms` json list of up to 2 signed forms.
    - `status` string with **default `received`** (the migration comment lists received | under_review | accepted | rejected | withdrawn), `ip`, `privacy_accepted_at`.
    - `reference` is unique, written in `created` as `MPB-YYYY-0042` (`formatReference`).
    - `user_id` is a nullable FK, `nullOnDelete`, with the comment "Set once authors can sign in".
    - Constants: `TYPES` (Original scientific paper, Short communication, Review paper, Professional paper), `MANUSCRIPT_EXTENSIONS` (doc, docx, pdf, odt, rtf), `FORM_EXTENSIONS` (pdf, docx), `MAX_FORMS=2`, `FORM_MAX_KB=5120`, `ATTACHMENT_LIMIT_BYTES=10MB`.
    - Helpers: `safeFileName()`, `files()`, `file($key)`, `fileUrl()` (temporary signed route), `presentForAdmin()`, `formConfig()`.
    - Migrations: `2026_11_01_173917_create_submissions_table.php`, plus columns added in `2026_11_02_000000_journal_redesign.php`.
- `app/Http/Controllers/SubmissionController.php::store`:
    - Honeypot field `website`.
    - Validation uses both `extensions:` and `mimes:` plus custom messages (mk in `lang/mk.json`).
    - `storeFile()` stores on the `local` disk under `submissions/{Y}/{uuid}.{ext}`, with the extension guessed from content.
    - Sends `ManuscriptSubmitted` to `config('journal.submissions_email')` (logs a warning if unset) and `SubmissionReceipt` to the author with `->locale(app()->getLocale())`.
    - Flashes a toast with `Inertia::flash('toast', …)` and redirects to `pages.show submit-your-paper`.
    - Route `POST submit-your-paper`, throttle 5/60.
- `app/Http/Controllers/SubmissionFileController.php`:
    - Invokable and protected by the **signed URL only (no auth)**; route `submissions.file`, `where file manuscript|form-[1-9]`, `signed`, throttle 60.
    - Streams `Storage::disk('local')->download` with `Cache-Control: private, no-store`, `X-Robots-Tag` and `nosniff`.
- `app/Http/Controllers/Admin/SubmissionAdminController.php`:
    - `index`: search q over reference, title, name, email; paginate 25; links valid 120 minutes.
    - `export`: CSV with BOM and `csvCell()` formula-injection guard.
    - **Any verified user can access it**; the docblock relies on "registration disabled".
- `resources/js/pages/admin/submissions/index.tsx` (384 lines): `AdminSubmission` type, a `useDate()` helper (Intl, `Europe/Skopje`, mk-MK/en-GB), search, pagination and export. Uses `t()`.
- `components/journal/submission-form.tsx` (1105 lines): exports `SubmissionForm` and `SubmissionChecklist`. Internals worth extracting: `ErrorSummary`, `FieldError`, `Section`, `Required`/`Optional`, `describe()`.
- `PageController` passes `Submission::formConfig()` for `submit-your-paper`.

**Reuse:** `reference` generation, `safeFileName`, the content-guessed `storeFile` pattern, the signed-download controller pattern, CSV export with injection guard, the `useDate` helper, and the ErrorSummary / FieldError a11y patterns.

**Must change**

- Decide the public form's fate: keep it as a guest fallback or redirect it to registration. The owner wants in-app authoring, so a "manuscript" now has structured content plus versions.
- Either evolve `Submission` (rename to `Manuscript`) or add new tables:
    - authors (ordered, affiliations, corresponding),
    - versions/rounds,
    - status_events (audit),
    - review_assignments (with an invitation token),
    - reviews (decision + note),
    - comments,
    - attachments,
    - payment fields (`paid_at`, `paid_by`, amount/currency snapshot, note).
- The status set must grow: `draft → submitted → under_review → revision_requested → resubmitted → accepted/rejected → (paid) → published/withdrawn`.
- **The admin routes need an admin gate.**
- File links for authed users should be **policy-checked routes, not bearer signed URLs**. The current signed links work for anyone holding them, which is fine for the editors' e-mail but not for reviewer files under blind review.

**Gotchas**

- `SubmissionTest` (18 tests) asserts the current public flow: redirect to `/submit-your-paper`, notifications, storage.
- `DashboardTest` (3 tests) asserts that _any_ verified user reaches `/admin/submissions`. That changes once roles exist.

## 8. Routes

**What exists**

- `routes/web.php` has the header comment "Owned by the foundation; later changes go through the lead". It contains:
    - public routes, `submissions.store`, sitemaps/feeds/OAI,
    - a catch-all `{path}` for `PageController::PATHS` and legacy redirects,
    - `auth` + `verified` group: `dashboard` → redirect `/admin/submissions`, and `admin/submissions`,
    - `require settings.php` and `submissions.php` at the end.
- `routes/submissions.php`: signed `submissions.file` and `auth` + `verified` `admin/submissions/export`.
- `bootstrap/app.php`: `Route::fallback` (404) runs through `web`.

**Must change**

- Add new route files, e.g. `routes/backoffice.php` required from `web.php`:
    - `auth` + `verified` + `role:` groups,
    - prefixes `admin/…`, `author/…` (or `my/…`), `review/…`,
    - a signed invitation route.
- Make `dashboard` role-aware.

**Gotchas**

- The `PageController` catch-all and the legacy `{post}` pattern (`volume-…`, `\d+_\d+_\d+-…`) are registered before the auth group. New path segments must not collide with `PageController::PATHS` (`editorial|editorial-board|submit-your-paper|guidelines(...)`) or the legacy regex.
- Wayfinder (`@laravel/vite-plugin-wayfinder`, `formVariants: true`) generates `resources/js/routes/**` and `resources/js/actions/**`. Run the dev server, the build, or `php artisan wayfinder:generate` after adding routes, or `tsc` fails.
- Those folders are lint-ignored and excluded from the i18n check.

## 9. Middleware

**What exists (`bootstrap/app.php`)**

- Global: `SecurityHeaders` prepended, `LegacyPathNormalizer` appended, `trustHosts()`, `trustProxies(127.0.0.1, ::1)`.
- `encryptCookies(except: ['appearance','sidebar_state','locale'])`.
- CSRF except `oai`.
- `ValidatePostSize` moved to after `StartSession`.
- Web group:
    - prepend `StatelessPublicRequests`
    - append `ValidatePostSize`, `WordPressQueryRedirect`, `PublicCache`, `SetLocale`, `HandleAppearance`, `HandleInertiaRequests`, `AddLinkHeadersForPreloadedAssets`
- `app/Http/Middleware/StatelessPublicRequests.php`:
    - An anonymous GET/HEAD with no session or `remember_*` cookie runs on the **`array` session driver**, and the session and XSRF cookies are stripped.
    - Exempt: routes whose gathered middleware includes `auth`, `guest`, `verified`, `password.confirm` or **`signed`** (or class names containing Authenticate / RequirePassword / EnsureEmailIsVerified), and `pages.show` paths in `STATEFUL_PAGES = ['submit-your-paper']`.
- `PublicCache.php`: `Cache-Control: public, max-age=300, swr=600` only when the stateless attribute is set, the user is null, there are no cookies, the status is 200 and no own directive is present. Configured in `config/http.php` (off in local).
- `SecurityHeaders.php`: nosniff, Referrer-Policy, `X-Frame-Options SAMEORIGIN` (empty in local), Permissions-Policy (camera, mic, payment and others disabled), HSTS on HTTPS, `X-Robots-Tag noindex` outside production.
- `SetLocale`: `locale` cookie (en/mk), `Vary: Cookie` on HTML and Inertia responses.

**Gotchas for the back-office**

1. **An invitation landing page must carry session-creating middleware** (`signed` or `guest`). Otherwise it renders stateless, with no CSRF cookie, and its form POST gets a 419. A public "create account" page is fine only if it is a Fortify route (`guest`). A custom page needs `guest` or an entry in `STATEFUL_PAGES`.
2. Every back-office route must be behind `auth`, so it is never publicly cacheable. Add `Cache-Control: private, no-store` on file downloads as the existing controller does.
3. **There is no CSP.** `app.blade.php` calls `Vite::cspNonce()`, but nothing sets a nonce or a CSP header. Adding a rich-text editor or inline styles has no CSP constraint today, but do not assume a nonce exists.
4. `X-Frame-Options SAMEORIGIN` allows previewing your own PDFs in an iframe (`components/journal/pdf-viewer.tsx`).
5. The `Permissions-Policy` does not block WebAuthn.
6. `app.blade.php` forces light mode only for `journal/` and `auth/` components. `SeoMeta::fallback($page)` makes pages without meta noindex, which is good for the back-office.
7. `ErrorPage` gives branded 403/404/419/429/500/503 pages (`app/Http/ErrorPage.php`), so `abort(403)` from policies renders a proper page.

## 10. Notifications and mail

**What exists**

- `app/Notifications/ManuscriptSubmitted.php`:
    - `ShouldQueue`, `tries 3`, backoff `[60,300]`.
    - 30-day signed links; attaches files up to 10 MB total.
    - English only, using markdown `MailMessage` lines and `->action('Open the submissions list', url('admin/submissions'))`.
- `SubmissionReceipt.php`: queued, localized with `__()` (keys in `lang/mk.json`), reply-to `journal.editorial_email`.
- There is **no `app/Mail`** and no `resources/views/vendor/mail` (the default Laravel mail theme). `vite.config.ts` fmt ignores `resources/views/mail/*`, a reserved path.
- Fortify's verify-email and reset-password mails are Laravel defaults, English only; `lang/mk.json` has 54 keys and none for those.

**Reuse:** the pattern (queued, tries/backoff, `->locale()`, reply-to, signed links).

**Must add**

- Notifications for: author submitted (to admin and author), reviewer invited (link to sign in or set password), review submitted (to admin), decision to author, revision requested, payment recorded, and status changed.
- Localize them, possibly with a branded mail theme.
- Store the user's preferred locale, since queued mail does not know the request locale. User implements `HasLocalePreference`.

**Gotcha:** sending is entirely queued (`QUEUE_CONNECTION=database`). If the Supervisor `bulletin-queue` worker is down, invitations never arrive. Tests run `QUEUE_CONNECTION=sync` and `MAIL_MAILER=array`.

## 11. Files and storage

**What exists:** `config/filesystems.php`

- `local` → `storage_path('app/private')` with **`'serve' => true`**. Laravel 11+ then registers a `storage.local` signed route (Wayfinder generated `routes/storage/local`).
- `public` → `storage/app/public`.
- `journal` → `storage/app/journal` (public volumes, `throw => true`).
- Submissions are stored at `storage/app/private/submissions/{Y}/{uuid}.ext`.
- Backups (`deploy/backup.sh`) tar `storage/app/private` nightly.

**Must add:** a folder convention such as `manuscripts/{id}/v{n}/…`, `reviews/{assignment}/…` and `figures/…`. Figure images in the template editor need an authed image-serving route (not public).

**Gotchas**

- `local.serve=true` exposes the private disk through temporary signed URLs. That is harmless unless someone calls `temporaryUrl`.
- Uploads are limited by `deploy/php.ini` (`upload_max_filesize 21M`, `post_max_size 24M`, `max_file_uploads 10`) and nginx `client_max_body_size 32m`.
- `journal.submission_max_kb` is 20480.

## 12. `config/journal.php` (facts and TO CONFIRM)

- `apc => ['amount' => 50, 'currency' => 'EUR', 'charged' => 'on acceptance']`. TO CONFIRM: DOAJ says no APC.
- `review_model => 'Blind peer review'`. TO CONFIRM: the pages disagree between blind, double-blind and single anonymous.
- `licence` CC BY 3.0. TO CONFIRM.
- `submissions_email` (env `JOURNAL_SUBMISSIONS_EMAIL`), `submission_max_kb` (env, default 20480), `editorial_email` `magl@ff.ukim.edu.mk`, `languages ['en','mk']`.
- `App\Journal\Journal::facts()` shares these as the `journal` Inertia prop (TS `JournalFacts` in `resources/js/types/journal.ts`).

**Must add (configurable, marked TO CONFIRM):**

- `review_model` as a machine value: `single_blind | double_blind`. It drives whether reviewers see author names and whether authors see reviewer names; per the review-policies page reviewers are never disclosed.
- `reviewers_per_manuscript` (the instructions say authors suggest 3 referees)
- `revision_deadline_days` (the instructions say "not more than 30 days")
- `review_deadline_days`
- the abstract word limits

**Template rules from the DB page `guidelines/instructions-for-authors`** (useful for the template schema):

- Sections in order: Title; authors with superscript numeric affiliations; corresponding author marked `*` with e-mail, phone and address; Abstract (≤250 words, or ≤100 for short communications); 3–6 keywords; Introduction; Material and methods (or Theoretical background); Results; Discussion (or a combined Results and discussion); Conclusions; Acknowledgements; References (author-year Harvard style, alphabetical then chronological, a/b suffixes).
- **Summary in Macedonian** (title, authors, affiliations, keywords, abstract) for English papers, or a summary in English for Macedonian professional papers.
- Tables: Arabic numbering ("Table 1"), caption above, footnotes below marked with superscript lowercase letters.
- Figures: "Fig. 1" with a caption.
- Abbreviations go in a first-page footnote.
- Appendices are numbered A.1 etc.
- The page `guidelines/review-policies` says reviewers are "never disclosed to authors".

## 13. Queue

`config/queue.php`: default `database`, `retry_after` 90, `after_commit false`.

- Supervisor runs `queue:work database --queue=default --tries=3 --backoff=60 --max-time=3600`.
- `deploy.sh` runs `queue:restart`.

**Gotcha:** with `after_commit false`, notifications dispatched inside DB transactions may run before commit. Use `->afterCommit()` or dispatch after the transaction.

## 14. Tests (`tests/Feature`)

**Conventions**

- PHPUnit 12 classes with `use RefreshDatabase` and `public function test_snake_case(): void`.
- SQLite `:memory:`, session `array`, queue `sync`, mail `array`, `INERTIA_SSR_ENABLED=false`, `BCRYPT_ROUNDS=4` (`phpunit.xml`).
- Fakes: `Storage::fake('local')`, `Notification::fake()`, `Notification::assertSentTo(new AnonymousNotifiable, …)`, `UploadedFile::fake()->create('paper.docx', 300, DOCX)`.
- Inertia: `->assertInertia(fn (Assert $page) => $page->component('…')->has(…))` with `use Inertia\Testing\AssertableInertia as Assert`, used in 13 files.
- `tests/TestCase.php` has `skipUnlessFortifyHas()`.
- `SubmissionTest` creates `Page::create(['path'=>'submit-your-paper',…])` in setUp and loads `routes/submissions.php` if it is missing.

**Test counts per file** (`test_` methods):

| Area     | File                         | Tests |
| -------- | ---------------------------- | ----- |
| Feature  | PlatformTest                 | 27    |
| Feature  | SeoTest                      | 20    |
| Feature  | SubmissionTest               | 18    |
| Feature  | PagesTest                    | 16    |
| Feature  | JournalTest                  | 12    |
| Feature  | FoundationTest               | 10    |
| Feature  | SearchTest                   | 10    |
| Feature  | BrowseTest                   | 9     |
| Feature  | ArticlePageTest              | 7     |
| Feature  | HomeTest                     | 6     |
| Feature  | ShellTest                    | 6     |
| Feature  | LegacyRedirectTest           | 6     |
| Feature  | DashboardTest                | 3     |
| Auth     | AuthenticationTest           | 6     |
| Auth     | EmailVerificationTest        | 7     |
| Auth     | PasswordResetTest            | 5     |
| Auth     | RegistrationTest             | 2     |
| Auth     | PasswordConfirmationTest     | 2     |
| Auth     | TwoFactorChallengeTest       | 2     |
| Auth     | VerificationNotificationTest | 2     |
| Settings | SecurityTest                 | 5     |
| Settings | ProfileUpdateTest            | 5     |
| Unit     | IssueContentParserTest       | 13    |
| Unit     | TextRepairTest               | 12    |
| Unit     | PdfMetadataExtractorTest     | 8     |
| Unit     | JournalDataCommandsTest      | 3     |
| Unit     | ExampleTest                  | 1     |

That is about 230 tests in total.

**Tests that will break with roles and registration:**

- `RegistrationTest` (both tests)
- `PlatformTest::test_auth_surface_is_restricted` and `test_editor_accounts_are_created_from_the_console` (if the command changes)
- `DashboardTest::test_the_dashboard_sends_editors_to_the_submissions_list`, which uses a role-less factory user
- possibly `SubmissionTest` if the public form changes

## 15. i18n

**Mechanics**

- `resources/js/lib/i18n.ts`: `useT()` returns `{ locale, t(text, vars) }`. The English text is the key, `{name}` placeholders, and English is the fallback.
- `resources/js/lang/mk.ts` (714 lines): a flat `Record<string,string>`.
- Backend: `__('…')` with `:name` placeholders, keys in `lang/mk.json` (54 keys).
- `scripts/i18n-check.mjs` (`npm run i18n:check`, add `--list` to print missing keys) fails on any `t('…')` without an mk.ts key, or any `__()` / `trans_choice()` without an mk.json key. It skips `routes`, `actions`, `wayfinder`, `components/ui` and `lang`.

**Gotchas**

- The i18n check is **not in CI** (`composer ci:check` runs `npm run check`, `npm run types:check` and `@test`), so it must be run manually.
- Only literal `t('…')` calls are detected. Dynamic keys (status labels from a map) need the literal strings present somewhere, or an explicit map of `t('Submitted')` calls.
- The starter-kit components (`app-sidebar`, `nav-main`, `nav-user`, settings layout and pages) are mostly untranslated.

## 16. Design tokens and UI components

**Tokens** (`resources/css/app.css`, 451 lines, Tailwind 4 `@theme`):

- Colors: `brand #2c4a8a`, `brand-dark #1f3770`, `ink #1e2a44`, `ink-soft`, `ink-muted #5b667a`, `mist #f4f7fb`, `tint #eaf1f9`, `line`, `line-strong`, `line-card`, `field #7a869c` (WCAG input border), `danger #b42318`, `navy-deep`, `sky`.
- Text sizes: `text-display`, `h1`–`h4`, `body` 17px, `ui` 15px, `meta` 13px, `eyebrow` 12px.
- Fonts: **Source Sans 3** (sans) and **Literata** (serif), self-hosted through laravel-vite-plugin `fonts`, with Latin, Latin-ext and Cyrillic subsets.
- `.journal`-scoped component classes: `.link-u`, `.btn-primary`, `.btn-outline`, `.btn-icon`, `.chip`, `.field`, `.eyebrow`, `.checklist`, `.toc-rail`, `.prose-journal`.
- **`.prose-journal table` today is a full-grid table** (`border border-line` on every `th`/`td` and a `bg-mist` header). It is **not** booktabs. The template needs a new `.manuscript`/`.booktabs` style: top rule, header rule, bottom rule, caption above, footnotes below in small type.
- shadcn tokens (`--background`, etc.) with dark variants, plus `journalTokens` overrides in AuthLayout.

**`components/ui`** (shadcn, Radix): alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, icon, input-otp, input, label, navigation-menu, placeholder-pattern, select, separator, sheet, sidebar, skeleton, sonner (toasts through `use-flash-toast`), spinner, toggle-group, toggle, tooltip.

**Missing:** textarea, tabs, table, radio-group, popover, command/combobox, switch, progress, calendar/date picker. **There is no rich-text, table or equation editor** (no TipTap, Lexical or ProseMirror) **and no PDF generator.**

**`components/journal/*`** (reusable look): `author-list`, `breadcrumbs`, `cms-page-header`, `section-nav`, `page-toc`, `pdf-viewer`, `icons` (LogoMark), `article-row`, `journal-facts`, `submission-form` (ErrorSummary and SubmissionChecklist patterns).

## 17. Dependencies

**composer.json:** php ^8.3, laravel/framework ^13.17, inertia-laravel ^3.0, fortify ^1.37.2, wayfinder ^0.1.14, tinker, laravel/chisel. Dev: larastan ^3.9, pint, phpunit ^12.5, pail, pao, sail, mockery, collision.

- No spatie/permission, no dompdf/snappy/browsershot, no activitylog, no medialibrary.

**package.json:**

- @inertiajs/react ^3, react ^19.2, @laravel/passkeys ^0.2, Radix packages, lucide-react ^0.475, sonner, cva, clsx, tailwind-merge, tailwindcss ^4, input-otp, typescript ^5.7.
- `vite` is aliased to `@voidzero-dev/vite-plus-core@1.4.0`, with vite-plus 1.4.0 and babel-plugin-react-compiler (React Compiler on).
- Scripts: `build`, `build:ssr`, `check` (`vp check`, which lints with `denyWarnings` and `typeAware` and formats with `sortTailwindcss`), `types:check`, `i18n:check`.
- Node >= 22.

## 18. Deployment (DEPLOY.md, `deploy/*`)

**Server**

- Ubuntu, nginx + PHP-FPM **8.3**.
- Extensions: pdo_sqlite, sqlite3, intl, mbstring, xml, curl, zip, fileinfo, opcache. **No gd or imagick listed.**
- Node 22 (NodeSource), Composer 2, Supervisor, certbot, git, rsync, sqlite3, **poppler-utils** (pdftotext, pdftoppm, pdfinfo) and optional `cwebp`.
- **No Chromium, LibreOffice or pandoc.**
- SQLite in WAL mode. Sessions use the file driver.

**Supervisor** (`deploy/supervisor.conf`): `bulletin-ssr` (`inertia:start-ssr`, port 13714) and `bulletin-queue`.

**Other server settings**

- php.ini: `memory_limit 256M`, `max_execution_time 60`, `opcache.validate_timestamps=0` (`deploy.sh` reloads FPM).
- Backups: SQLite snapshot plus `private.tar.gz` plus `.env`, nightly.

**Implications**

- PDF export of the template needs one of:
    - a pure-PHP generator (dompdf/mpdf; images need gd or imagick, which must be added to the server),
    - installing Chromium (Browsershot/Puppeteer, which is heavy),
    - browser print CSS ("Print/Save as PDF"), the zero-dependency option.
- DEPLOY.md documents `journal:editor`; update it with roles and the queue being needed for invitations.

## 19. Static analysis and CI

**phpstan.neon:** larastan, **level 7**, paths `app/`, `bootstrap/app.php`, `config/`, `database/`, `routes/`. Needs typed relations (`/** @return BelongsTo<User, $this> */`) and array shapes, as in the existing code.

**`.github/workflows/tests.yml`:** ubuntu, **PHP 8.3**, Node 22, `composer setup`, then `composer ci:check`, which runs:

- `vp check` (lint and format)
- `tsc --noEmit`
- `config:clear`
- pint `--test`
- phpstan
- `artisan test`

**Gotcha:** local PHP is **8.5.5**, while CI and production are 8.3. Do not use 8.4+ syntax (property hooks, asymmetric visibility, `new` without parentheses in chains, `array_find`/`array_any`, the pipe operator).

---

## Constraints any plan must respect

1. **Roles do not exist yet.** Add the role model (preferably multi-role, since one person can be both author and reviewer), policies and a role middleware. Every back-office route goes behind `auth` + `verified` + a role/policy check. The current `/admin/submissions` and export are open to any verified user.
2. **Registration:** enabling `Features::registration()` must create AUTHORS only and needs a new `pages/auth/register.tsx`. The provider already points `registerView` at it. Reviewers come in through an admin invite (signed link plus set-password, verified by the invite). Admins come from the console command.
3. **The session-less public middleware:** any new page with a form outside `auth`/`guest`/`signed` routes gets no session or CSRF token (419) and could be marked `public` cacheable. Use `signed`/`guest` middleware or `STATEFUL_PAGES`.
4. **Private files** go on the `local` disk with UUID names and content-guessed extensions. Downloads for authed users must be policy-checked. A bearer signed URL is acceptable only in e-mails, and never for anything that would break the blind review model.
5. **Blind review is configurable** (`config/journal.php` `review_model`, TO CONFIRM). Reviewers are never shown to authors. Whether authors are hidden from reviewers depends on the config. Never hard-code APC (currently 50 EUR, TO CONFIRM), licence or the review model.
6. **Full audit trail:** an immutable status-event log (who, from, to, note, when) plus versioned manuscript snapshots for the diff (track changes). Prevent hard deletes of users who have papers or reviews (`ProfileController::destroy` and the `nullOnDelete` FK today).
7. **All UI strings go through `t('English')` with mk.ts keys, and all server strings through `__()` with `lang/mk.json`.** Run `npm run i18n:check` manually, because it is not in CI. Queued mail must be localized per recipient (store the user's locale).
8. **Mail is queued** (database queue, Supervisor worker). Dispatch after commit. Tests use sync/array plus `Notification::fake()`.
9. **The template must follow the instructions for authors:** the section order listed in §12, Harvard references and a Macedonian summary. Tables are booktabs-style (new CSS; the current `.prose-journal table` is a full grid), **single-column body** (the owner's change from the PDF), with Literata/Source Sans or Times-like print styling. No editor library or PDF engine is installed, and the server has no Chromium or gd. Choose the editor and PDF approach deliberately and add any needed server packages to DEPLOY.md.
10. **Layout and branding:** `admin/*`, `author/*` and `reviewer/*` pages automatically get `app-layout` (sidebar). The starter-kit sidebar (GitHub and Docs links, "Platform", untranslated) must be replaced with role-aware, translated navigation. Keep the Nexsol Labs credit (`https://nexsollabs.com`). AuthLayout copy must stop saying "editorial office only".
11. **Existing tests to update deliberately:** RegistrationTest (2), `PlatformTest::test_auth_surface_is_restricted` and `test_editor_accounts_are_created_from_the_console`, DashboardTest (3), and SubmissionTest (18) if the public form changes. New tests follow the PHPUnit class style with RefreshDatabase and `assertInertia`.
12. **Code quality gates:** larastan level 7, pint, `vp check` with `denyWarnings` and type-aware lint, `tsc`, PHP 8.3 syntax only. Regenerate Wayfinder routes after adding routes.
13. **`routes/web.php` is "owned by the foundation".** Add new route files (required from `web.php`) instead of editing broadly. Avoid path collisions with the `PageController` catch-all and the legacy redirect patterns.
14. **Payments:** an admin-only paid/unpaid flag per manuscript, with who and when recorded, and the amount/currency snapshot taken from `config('journal.apc')`. It belongs in the audit log, and the author should see only their own status, if anything.
