# Editorial back-office: plan

Planned on 2026-11-09 (multi-agent research, three independent designs, synthesis and a critical review). Nothing is implemented yet; work starts after the owner approves.

| File                                                                               | What it is                                                                                                                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [plan.md](plan.md)                                                                 | The full implementation plan (data model, statuses, editor, PDF, reviewer and admin workspaces, routes, tests, releases, open questions). |
| [review.md](review.md)                                                             | The critical review of the plan. Its corrections are applied below and **override plan.md** where they differ.                            |
| [research/manuscript-template-spec.md](research/manuscript-template-spec.md)       | The journal template taken from 71_2_001.pdf, other volume 71/72 papers and the Instructions for authors.                                 |
| [research/editorial-practice-and-tech.md](research/editorial-practice-and-tech.md) | Peer-review practice (OJS, ScholarOne, COPE) and the library choices (TipTap v3, WeasyPrint, diff).                                       |
| [research/codebase-map.md](research/codebase-map.md)                               | What exists in this codebase and what the back-office must respect.                                                                       |

## Owner's requirements (2026-11-09)

- Sign-in and account creation. Three roles: admin (editorial office), author, reviewer.
- Authors write the paper in the app on a fixed template, so every paper looks the same. Tables follow the journal's style.
- The author sends the finished paper, and its status becomes "submitted".
- The admin adds reviewers by e-mail. Each reviewer gets a link to sign in and see their papers.
- Reviewers return a decision (accept / decline / revision) with a note. They can also comment and upload files.
- Track changes: a full history for every status and every version.
- The admin sees everything for every paper and author, and marks each paper paid or unpaid.
- The template is 71_2_001.pdf, with one change: **the body (from "Introduction" to the end) is one column**. The first page (title, authors, affiliations, dates, abstract, key words) keeps its layout. Confirmed from the owner's screenshot of pages 3–4.

## Corrections applied from the review (override plan.md)

1. **Draft discard.** No events are written until the first submit, so a never-submitted draft can be deleted.
2. **Queues.** PDFs get their own `pdf` queue and Supervisor program (`--timeout=150`, `retry_after=180`, `tries=1`). Mail stays on `default`.
3. **Reference numbers.** A `reference_sequences(year, last)` table is shared by the legacy form and manuscripts (`MPB-YYYY-NNNN`).
4. **Technical return.** It goes back to the author and returns to `submitted`, with no new round and no response letter. A round increments only after a round that had reviewers.
5. **Anonymity in upload mode.** Under double-anonymous review the author uploads an anonymised manuscript and a separate title page.
    - The admin marks the review file, and reviewers only ever get that file.
    - Image EXIF and PNG text chunks are stripped.
    - The DOCX scrub covers comments, people, tracked-change authors and custom properties.
6. **Conflict of interest with a one-person office.** The guard applies only when another admin without a conflict exists. Otherwise the admin proceeds with a logged override.
    - A per-manuscript handling editor (guest editor) is possible.
7. **Forwarded invitations.** If the signed-in e-mail differs from the invited one, the manuscript is withheld until an admin confirms.
    - The token is exchanged for a session on the first request and removed from the URL.
8. **Scope cut for a ~2-issue journal.** Out, or deferred until asked for:
    - equations (use an image), the e-mailed sign-in link, the audit hash chain, unread counters, notification debouncing;
    - the accepted-PDF variant, structured review questions, the Crossref lookup, the abbreviations footnote, appendices, multi-currency totals.

    Release 2 is split into 2a and 2b (below).

9. **Frozen versions.** Only `content`, `submission_data` and `content_hash` are immutable. Rendered HTML is a cache keyed by renderer version, and PDFs live in `manuscript_files`.
10. **GDPR.** Event payloads hold ids only. Personal data stays in tables that can be scrubbed.
    - IPs are kept for a limited time.
    - `journal:erase-person {email}` pseudonymises a person.
    - The invitation e-mail carries a privacy line.
11. **`journal:create-editor`.** Its tests (SubmissionTest) and the README line are updated when it is replaced.
12. **Also adopted from the review:**
    - Word paste splits into sections from the start.
    - Duplicate block ids across sections are detected.
    - In upload mode, resubmission asks for a marked-up and a clean file.
    - Desk queues cover "too few active reviewers" and "revision overdue". `min_reviews` defaults to 2 (TO CONFIRM).
    - Payment is editable in any status and records payer and invoice fields; the currency is configurable.
    - The admin can create a manuscript on behalf of an author.
    - Cyrillic-safe admin search.
    - Autosave survives an expired session.
    - Real mail domain with SPF, DKIM and DMARC.
    - Accessibility checks in every release.
    - Registration asks for the minimum.
    - Co-authors are notified when the paper is submitted.
    - The similarity-check result is recorded.
    - Letters are Blade templates per locale.
    - The author is warned not to sign the response letter under double-anonymous review.

## Releases

| Release                   | Content                                                                                                                                                                      | Demo at the end                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0 – spikes                | Editor tables (TipTap v3 TableKit, booktabs style, Word/Excel paste) and the PDF engine (WeasyPrint vs Chromium + Paged.js). Each produces a sample to approve.              | A table from 71_2_001 rebuilt in the editor. One sample PDF page in one column.                                |
| 1 – accounts              | Registration (authors), sign-in, roles, admin 2FA, `/dashboard` per role, users admin.                                                                                       | An author registers and signs in; the admin promotes a reviewer; others get 403 on `/admin`.                   |
| 2a – submit and desk      | Manuscript with structured front matter and an uploaded body, submit, the admin desk (list, detail, filters), payments (paid / unpaid / waived), status history.             | An author submits; the admin sees it, filters, and marks it paid; the history shows each step.                 |
| 2b – peer review          | Reviewer invitations by e-mail, reviewer workspace (recommendation, note to editor, comments to author, files, messages), decisions and letters, revision rounds, reminders. | The full cycle: submit → 2 reviewers → revision → resubmit → accept → paid. **The office can start using it.** |
| 3 – template editor       | The in-app editor on the journal template (sections per article type, booktabs tables, figures, references), live preview, browser print.                                    | An author rebuilds 71_2_001 in the app; the preview matches the journal in one column.                         |
| 4 – track changes and PDF | Version comparison (word-level, including table cells), server PDFs (submission, anonymised review copy, proof).                                                             | A v1 ↔ v2 diff; an anonymised review PDF; a proof matching 71_2_001 in one column.                             |
| 5 – publishing and polish | Publish an accepted paper into an issue on the public site, Word import, editable letters, accessibility pass, help pages.                                                   | A pilot with 2–3 real manuscripts.                                                                             |

## Status (2026-11-09)

- **Release 0, done.**
    - S1, editor tables: the prototype is at `/lab/editor` (local only). TipTap 3.33 with MIT packages; booktabs tables with caption and notes, merged cells, Word/Excel paste, JSON round trip. Styles are in `resources/css/manuscript.css`.
    - S2, PDF: **WeasyPrint 70 chosen.** The sample is `spikes/pdf/sample-weasyprint.pdf`: 71_2_001 in one column with running heads, pages starting at 3, footnote, booktabs tables with a repeated header, and Cyrillic.
    - Production needs WeasyPrint in a venv (`pip install weasyprint==70.0`; the Ubuntu apt package is too old), called through `spikes/pdf/render.py`, which adds Macedonian hyphenation.
- **Release 1, done.**
    - Roles (`user_roles`, `App\Enums\Role`) and the account history (`user_events`).
    - Author sign-up with profile fields, ORCID check and throttling.
    - Admin second factor (required in production), a role-aware `/dashboard`, `/admin/users` (roles, deactivation), and `journal:editor`, which grants admin.
    - The profile has the new fields. Macedonian translations are in place, and tests cover `RolesTest`, `RegistrationTest` and `DashboardTest`.
- **Owner's decision on 2026-11-09:** the template editor comes before the upload workflow. Authors write in the system from the start, and the public upload form is closed (`JOURNAL_GUEST_SUBMISSIONS=false`).
- **Writing and sending, in progress.**
    - Tables `manuscripts`, `manuscript_drafts`, `manuscript_versions` and `manuscript_events` (append-only, with SQLite triggers), plus shared `reference_sequences`.
    - `ManuscriptWorkflow` (create, autosave with an optimistic lock, submit, discard) and `ManuscriptChecker` (template rules).
    - `ManuscriptRenderer` (allowlisted HTML; header rows go into `<thead>`), `ManuscriptPolicy`, author and admin controllers, e-mails, and `config/manuscript.php`.
    - The author editor page follows the TypeScript contract in `resources/js/types/manuscript.ts`.
- **Figures, Word export and publication details, done.**
    - Figures: images are re-encoded with GD to strip their metadata; "Fig. N." sits below each image.
    - Word export: PHPWord, in the journal layout.
    - Publication details: the editorial office sets the DOI, volume, issue, pages and year.
- **Peer review (release 2b), backend done.**
    - `review_assignments`, `review_files` and `manuscript_decisions` (decisions are final).
    - `ReviewWorkflow`: invite by e-mail with a signed link and a hashed single-use secret; a one-step reviewer account from the link; accept or decline with competing interests; draft and submit a review with files for the author or the editor; withdraw; remind; expire; decide (accept, minor or major revision, reject) with a letter; resubmit with a response to the reviewers; the next round keeps "Reviewer N".
    - Double-anonymous by default, both in the HTML and the Word file.
    - `journal:review-reminders` runs daily at 08:00 Europe/Skopje.
    - `EditorialStats` feeds the admin dashboard and the reviewers page.
- **Next:** payments (paid / unpaid / waived) per manuscript.

Open questions for the editorial office: plan.md §17. Each has a safe default in config, marked TO CONFIRM, so they do not block the work.
