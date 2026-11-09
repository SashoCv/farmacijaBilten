**Review of the editorial back-office plan for `/Users/sasho/Sites/bilten_farmacija`**

The plan's core design is sound: multiple roles per user, one workflow service, frozen versions, anonymity built into the data structure, and the workflow shipping before the editor. The problems below are listed in priority order. Items marked "verified" were checked against the repository.

## [must-fix]

1. **Discarding a draft is blocked by the plan's own triggers.** A draft gets a `created` event, and §5.4 puts a `BEFORE DELETE` trigger on `manuscript_events`. So `DELETE author/manuscripts/{m}` on a never-submitted draft fails, whether the delete cascades or is restricted.
    - Fix: write no events until the first submit (keep draft history only in `updated_at`). Alternatively, make discard a soft state, `status = discarded`, kept out of every list.

2. **PDF jobs will be killed and run twice by the current queue settings (verified).**
    - `config/queue.php` has `retry_after = 90`. `deploy/supervisor.conf` runs `queue:work` without `--timeout`, so the default is 60 s. The plan gives WeasyPrint a 120 s process timeout and puts it on the same single worker that sends invitations.
    - Fix: add a separate `pdf` queue and Supervisor program with `--timeout=150`, a `pdf` connection with `retry_after=180`, and `tries=1` for the PDF job. Mail stays on `default`, so one slow PDF never delays an invitation.

3. **Reference numbers will collide (verified).** `Submission::formatReference()` builds `MPB-YYYY-%04d` from the row id, not a per-year sequence. If manuscripts use "max+1 across both tables" while the legacy form keeps using ids, a legacy row with id 43 can produce MPB-2026-0043 after a manuscript already took that number.
    - Fix: add a `reference_sequences(year PK, last)` table, incremented inside the transaction. Switch both `Submission::booted()` and `ReferenceNumber` to it. Keep the unique index and retry on conflict.

4. **A technical return breaks round numbering.** The path is `submitted → return_technical → revision_requested → resubmit → resubmitted → send_to_review`, which runs `current_round++`. That creates "round 2" when no review happened. `accept` from `resubmitted` then looks for reviews from a "previous round" that does not exist.
    - Fix: a technical return goes back to `submitted` (as `returned_to_author` → `submitted`), not to `resubmitted`, with no round change and no response letter. Alternatively, increment the round only when the closing round had at least one assignment. Add both paths to the `WorkflowTransitionsTest` provider.

5. **Double-anonymous review cannot be enforced in upload mode (release 2), and figures leak identity in every release.** Scrubbing `docProps/core.xml` and `app.xml` is not enough:
    - DOCX keeps names in `word/comments.xml` and `people.xml`, in `w:author` on `w:ins`/`w:del`, in `docProps/custom.xml`, and on the title page itself;
    - JPEG EXIF (Artist, Copyright) and PNG `tEXt`/`iTXt` chunks also carry names, and the plan never strips them.

    Fix:
    - In upload mode under `double_anonymous`, the author uploads two files: "Manuscript (anonymised, for reviewers)" and "Title page".
    - The admin marks which file is the review file during the technical check, as OJS does with its "review file". Reviewers only ever get that file.
    - Strip JPEG APP1/APP13 segments and PNG text chunks in pure PHP on upload. This needs no gd.
    - Extend the DOCX scrub to cover comments, people, tracked-change authors and custom properties.

6. **The COI guard can lock out a one-person editorial office, and it contradicts "admin sees everything".** With `editor_conflict_guard = true` and one admin who co-authors a paper, nobody can decide on that paper.
    - Fix: apply the guard only when another admin without a conflict exists. Otherwise allow the admin to proceed with a mandatory `coi_override` event and a banner.
    - Make `handling_editor_id` a per-manuscript capability, so a board member can act as guest editor for one paper without becoming a global admin. This also answers Q12 without needing a redesign later.

7. **"Accept with my current account" lets anyone holding a forwarded link become a reviewer.** Professors forward invitations to colleagues and secretaries, and the plan only notifies the admin after the full text is already visible.
    - Fix: when the signed-in e-mail differs from the invited one, put the assignment in `accepted_pending_confirmation` and withhold the manuscript until an admin confirms. Alternatively, e-mail a 6-digit code to the invited address.
    - Also exchange the token for a session on the first GET and redirect to a URL without the token, so it stays out of nginx logs and browser history.

8. **The scope does not fit a journal with about 2 issues and 20–40 papers a year, or an owner who wants speed.** Release 2 packs almost the whole domain into "3 weeks", and 12–14 weeks overall is optimistic. Realistically this is 16–20 weeks.
    - **Cut or defer:**
        - equations, MathJax and KaTeX (pharmacy papers need sub and sup, not display maths; an equation can be an uploaded image);
        - the e-mailed sign-in link;
        - the audit hash chain;
        - `message_reads` and unread counts (use "last activity" instead);
        - per-thread notification debouncing;
        - the `accepted` PDF variant;
        - structured review questions;
        - the Crossref lookup (release 5);
        - the abbreviations footnote;
        - appendices (release 5);
        - user deactivation UI beyond a single toggle;
        - multi-currency totals.
    - **Split release 2:**
        - 2a (2 weeks): submit with upload, admin desk, list and detail, payments, status history;
        - 2b (2 weeks): invitations, reviewer workspace, decisions, revision rounds, reminders.

9. **The screenshot that defines the one-column requirement was never examined.** The path under `/var/folders/.../NSIRD_screencaptureui_*` is not readable ("Operation not permitted"). "Samo ovoj del" ("only this part") may mean only part of the page, for example the body after the abstract, or one specific block.
    - Fix: before S2, get the owner to confirm which region goes to one column, ideally by marking up a page of 71_2_001. The S2 sign-off should then use that exact page.

10. **Removing `CreateEditor` breaks tests and docs the plan says are untouched (verified).** `tests/Feature/SubmissionTest.php` lines 356–373 run `journal:create-editor` (3 of the 18 tests), and README.md line 76 documents it.
    - Fix: list these tests under "existing tests to rewrite", move their assertions to the `journal:editor` tests in PlatformTest, and update README.md.

11. **Frozen HTML makes a sanitiser or renderer bug permanent.** `manuscript_versions.html` and `html_anonymised` are append-only and protected by a trigger, so an XSS or anonymisation bug found later can never be fixed in place.
    - Fix: only `content`, `submission_data` and `content_hash` are immutable. Treat HTML and blocks as a cache keyed by `renderer_version` that can be re-rendered.
    - Remove `pdf_file_id` and `review_pdf_file_id`, because `manuscript_files(version_id, kind=generated_pdf, variant)` already holds them. The version row can then be fully immutable with a simple trigger, instead of a fragile `UPDATE OF` column list.

12. **Append-only events conflict with GDPR erasure.** Payloads would hold e-mails (`accepted_with_email`, invitee addresses, COI text) and IP addresses, and the triggers block pseudonymisation.
    - Fix: event payloads hold ids only (user, assignment, file). Personal data stays in mutable tables that can be scrubbed.
    - Set a retention period for `ip`.
    - Add a `journal:erase-person {email}` command that pseudonymises users, assignments and `mail_log`.
    - Name the data controller (the Association or the Faculty) under the North Macedonian Law on Personal Data Protection, and add a privacy line to the invitation e-mail for people who have no account.

## [should-fix]

13. **Word paste must split into sections in release 3, not release 5.** On day one, authors will paste the whole paper into "Introduction". Map pasted H1/H2 and known heading text (Introduction, Material and methods, …) to sections in `paste/word.ts` without mammoth. Keep mammoth's full "Import .docx" for release 5.

14. **Block ids can be duplicated across section editors.** UniqueID only removes duplicates inside one editor, so copying from one section into another duplicates ids, and that breaks diffs and cross-references. `ContentValidator` must detect duplicate ids across the whole document and either repair them (and return the remap) or reject them.

15. **Track changes in upload mode is empty.** For `source = upload`, require a "marked-up version (Word track changes)" plus a clean version on resubmission, which is standard practice. Show the marked-up file in place of the diff.

16. **The desk misses some stuck states.** Add queues for:
    - under review with fewer active (invited or accepted) assignments than `journal.review.min_reviews`, for example when everyone declined;
    - revision overdue by N days, with an admin action "Close: revision not received" (withdrawn, with a reason).

    Make `min_reviews` (default 2, TO CONFIRM) the guard for `accept`, not "at least one".

17. **Payment must be editable in any status, and the payer needs invoice fields.** The owner wants paid/unpaid on every paper, and authors sometimes pay before acceptance. Add `payer_name`, `payer_institution` and `payer_tax_id` (EDB) for the faculty finance office. Make the currency configurable, with MKD as a likely option.

18. **The admin needs "Create manuscript on behalf of an author".** It covers papers that arrive by e-mail, and the author is invited to claim it. This is more common in practice than legacy import.

19. **Cyrillic search fails in SQLite.** `LIKE` is case-insensitive only for ASCII, so admin search for "Петровска" or "петровска" breaks. Store a normalised `search_text` (mb_strtolower, plus Latin transliteration) on `manuscripts` and `contributors`, or reuse the existing FTS index from `IndexSearch`.

20. **WeasyPrint may not hyphenate Macedonian.** Pyphen has no `mk` dictionary as far as I know. Verify in S2; otherwise turn hyphenation off for `lang=mk`, or fall back to a related dictionary only after the owner approves a sample.

21. **Pin the libraries to real, current packages.**
    - `mathjax-full` is the v3 name; v4 moved to `@mathjax/src`. This becomes moot if item 8 removes equations.
    - TipTap v3's UniqueID and Mathematics extensions were open-sourced under MIT. Verify this on npm and prefer `@tiptap/extension-mathematics` over a custom node if equations stay.
    - Confirm the `symfony/html-sanitizer` major matches Laravel 13's Symfony.

22. **Autosave must handle an expired session.** Sessions use the file driver with a 120-minute lifetime (verified). The plan only handles 409. Handle 401 and 419 explicitly: keep the localStorage copy, show "Session expired — sign in in a new tab, your changes are kept", and retry. Add a test for this.

23. **Mail deliverability.**
    - `MAIL_FROM` is `no-reply@example.org` in `.env.example` (verified), and Reply-To would be a personal mailbox (`magl@ff.ukim.edu.mk`).
    - Use a transactional provider (Postmark, SES or Brevo) on the site's domain with SPF, DKIM and DMARC, plus a bounce webhook that sets `mail_log.status = bounced`. Today "sent" only means the SMTP server accepted the message, and the admin will read it as "delivered".
    - Send plain-text alternatives and use a dedicated editorial mailbox for Reply-To.

24. **Accessibility belongs in every release, not release 5.**
    - Add axe checks (Playwright) to CI for the auth, reviewer and admin pages.
    - The editor needs keyboard table operations and visible focus.
    - Status and payment badges must use text, not colour alone.

25. **Testing gaps.**
    - The most complex UI (editor tables, merge, reload round-trip, paste) has no automated browser test; add a Playwright smoke suite.
    - Add a CI step for `vp build --ssr`, to prove ProseMirror stays out of the SSR bundle.
    - Add a test that a rolled-back transition queues no notification.
    - Add a migration test that backfills `given_name` and `family_name` on a production-like users table.
    - Add a timezone test for the 08:00 Europe/Skopje reminders.

26. **Registration asks too much.** Required fields should be given name, family name, e-mail, password, affiliation, country and privacy acceptance. Department, city, phone, title and ORCID go to the profile and are prompted at submit when needed: phone only for the corresponding author.

27. **Notify co-authors at submission.** "You have been listed as an author of MPB-…" is COPE practice against fake authorship. It is cheap and uses the contributors projection. Make it configurable.

28. **Record the similarity check.** Add similarity % and an uploaded report (iThenticate or Crossref Similarity Check) to the technical-check panel. Any professional journal, and DOAJ, expects this.

29. **Letter templates.** Laravel's translator does not load `lang/{en,mk}/letters/*.md`, and `lang/en` does not exist (verified: only `lang/mk.json` and `lang/mk/`). Use `resources/views/letters/{locale}/*.blade.php` (markdown mail), or a small loader. Seed them in the database if admin-editable letters stay in release 5.

30. **The response letter can identify the authors.** Under double-anonymous review it is shown to reviewers and may be signed. Add an author-side warning and include it in the checker's self-identification warning.

## [nice-to-have]

31. **Reviewer certificate.** Offer a downloadable PDF "confirmation of review" once a review is submitted. Macedonian academics need it for habilitation, and it helps recruit reviewers.
32. **Link resubmitted rejections.** Add a "resubmission of MPB-…" field that connects a new manuscript to a previously rejected one.
33. **Language attributes in the editor.** Set `lang` and `spellcheck` per editor from the manuscript language, and set them for the other language on the Резиме/Summary editors.
34. **Simpler header link.** The public header can use a static "Sign in / My account" link that points to `/dashboard`. Its text then never depends on the session, which is safer with `PublicCache`.
35. **Wider COI checks.** Match on `user_id` and ORCID, not only on e-mail.
36. **Publishing.** Reuse the existing `SyncCrossref` command and the `journal:import` data shape when publishing creates the `Article`.
37. **Upload safety.** Cap the uncompressed size when scrubbing DOCX/XLSX archives, to guard against zip bombs.
