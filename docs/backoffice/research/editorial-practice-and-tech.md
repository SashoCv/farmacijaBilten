# Research: editorial workflow and technology choices for the Macedonian Pharmaceutical Bulletin

Researched 2026-11-09. Where a fact could not be verified on the web it is marked **(verify)**. Journal facts stay in `config/journal.php` as TO CONFIRM.

---

## 0. What the reference PDF shows (`/Users/sasho/Downloads/71_2_001.pdf`)

I read it with pdfinfo, pdffonts and pdftotext. These are the template requirements:

- **Producer:** MS Word 2019. Fonts are Times New Roman (regular, italic, bold). The PDF is tagged.
- **Page size:** 581.52 × 813.96 pt, about 205 × 287 mm. This is not A4. Ask the editors about the trim size (TO CONFIRM) and put it in config.
- **First-page head block,** right-aligned:
    - "Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)"
    - ISSN 1857-8969
    - DOI 10.33320/maced.pharm.bull.2025.71.02.001
    - Article type ("Review paper")
- **Title:** centred and bold.
- **Authors:** superscript affiliation numbers, with `*` marking the corresponding author.
- **Affiliations:** numbered and centred.
- **Dates line:** "Received: February 2025; Accepted: April 2025".
- **Abstract:** heading, then one paragraph, then a "Key words:" line.
- **Sections in this review:** Introduction, thematic sections, Conclusion, References. Research papers will have their own set (Materials and methods, Results and discussion, …). The list of article types and their sections is TO CONFIRM.
- **Corresponding-author footnote** at the bottom of page 1: rule, then "*email: …".
- **Running heads:**
    - Even (left) pages: page number on the left, then the author list as initials and surnames.
    - Odd (right) pages: the short title, truncated with "…", then the page number on the right.
    - Page numbers continue through the issue (this paper is pp. 3–11), so the PDF engine must be able to **start numbering at the article's first page**.
- **Tables:** "Table 1." caption above, with a tab before the caption text. Rules are booktabs-style. Footnotes are small and sit below the table.
- **References:** Harvard author–year, e.g. "Dasenaki, M.E., Thomaidis, N.S., 2019. Title… https://doi.org/…". In-text citations look like "(Tyagi et al., 2014; Rajauria and Tiwari, 2018)".
- **The owner's change:** body text in **one column**, not two.

---

## A. Peer-review workflow

### How the major systems work

- **OJS 3** has 4 stages: Submission → Review → Copyediting → Production. Each stage has its own discussion panel.
    - Editor decisions: Decline (desk reject), Accept and Skip Review, Request Revisions, Resubmit for Review, Send to Copyediting, Send to Production.
    - Reviewer recommendations (internal constants): accept, pending revisions, resubmit here, resubmit elsewhere, decline, see comments. Journals often relabel these as "Minor/Major revisions".
    - Review methods: anonymous reviewer/anonymous author, anonymous reviewer/disclosed author, and open. The method is set per review assignment.
- **Editorial Manager** (and ScholarOne in the same way):
    - Reviewer invitations have a due date.
    - Automated reminders go out in nightly batches: before the due date, on it, and when overdue.
    - Reviewers who do not respond can be uninvited automatically, and previous-round reviewers can be re-invited.
    - Reminders need a due date to work.
- **COPE guidance for reviewers (v2, 2017):**
    - Reviewers keep the manuscript confidential.
    - They declare competing interests, or ask the journal when unsure.
    - They do not contact authors directly.
    - They report suspected misconduct or overlap to the editor.
    - The journal publishes a clear review policy.
- **Common to all three systems:**
    - Each review has two text fields: **comments to the author** and **confidential comments to the editor**.
    - The reviewer's recommendation is separate from the editor's decision. Only the editor makes the decision.

### Recommended state machine for a small journal

There is one editorial office and 2 issues a year. Ten statuses are enough. "Minor/major revision" and "technical return" are stored as attributes of the decision rather than as separate statuses.

```
draft ──submit──▶ submitted ──(admin technical check)──┬─▶ under_review
  ▲                   │                                 │
  │                   ├─ return for technical fixes ─▶ revision_requested{type=technical}
  │                   └─ desk reject ─▶ rejected        │
  │                                                     ▼
  │      under_review ──editor decision──┬─▶ revision_requested{type=minor|major, due_at}
  │                                      ├─▶ accepted
  │                                      └─▶ rejected
  │      revision_requested ──author submits v(n+1) + response letter──▶ resubmitted
  │      resubmitted ──▶ under_review (new round, same or new reviewers)
  │                  └─▶ editor decides directly (typical for minor revisions)
  │      accepted ──▶ in_production (copyedit, typeset, author proof) ──▶ published (linked to Article + Issue)
  └─ any state before published ──▶ withdrawn (author asks, admin confirms)
```

**Statuses:** `draft`, `submitted`, `under_review`, `revision_requested`, `resubmitted`, `accepted`, `in_production`, `published`, `rejected`, `withdrawn`.

**Design rules:**

- Transitions go through **one service** (for example `SubmissionWorkflow::transition($submission, $decision, $actor, $payload)`). It does four things:
    - checks that the transition is allowed, using a PHP enum with an `allowedTransitions()` map;
    - checks the actor's role and policy;
    - writes the audit event;
    - queues the notifications.
- No controller ever sets `status` directly.
- **Payment is a separate field,** not a workflow status: `payment_status` = `not_required | unpaid | invoiced | paid | waived`, plus amount, reference, paid_at and `marked_by`.
    - The fee amount and timing are TO CONFIRM. The old site says 50 EUR "upon acceptance", while DOAJ says there is no APC.
    - Add a config switch that controls whether `published` requires `paid|waived`.
- **Rounds:** `round` is an integer on the review assignments and on the manuscript versions. Each `resubmitted → under_review` step starts round n+1.

### Reviewer assignment sub-workflow

Statuses: `invited → accepted | declined | expired → submitted (completed) | cancelled`.

1. The admin enters a reviewer's e-mail (and optional name), chooses a response deadline and a review due date, and optionally edits the invitation e-mail.
2. The system creates a `review_invitations` row holding a **hashed single-use token** with an expiry. The e-mail contains a **signed link** to an invitation page that shows the title and abstract only, never the full text before acceptance.
3. On the invitation page the reviewer chooses accept or decline. Declining has an optional reason and an optional "suggest another reviewer".
    - **Accepting requires a competing-interests declaration:** either "none" or a description, as COPE asks.
    - A new reviewer then sets a password, or signs in to an existing account. That account gets the `reviewer` role.
    - The account must still verify its e-mail. Clicking the token link verifies it.
4. **Review form:**
    - Recommendation: Accept / Minor revision / Major revision / Reject. In the owner's words these are "accepted", "returned for revision" and "declined"; minor/major is kept because it is industry standard.
    - Comments to author (required).
    - Confidential comments to the editor (optional).
    - Optional structured questions: originality, methodology, statistics, language, references. Make these configurable.
    - File uploads, each flagged "visible to author" or "editor only".
5. After submission the review is locked. The admin can unlock it.
6. **Reminders:** a daily scheduled command sends:
    - an invitation reminder after N days without a response;
    - a review reminder N days before the due date;
    - an overdue reminder;
    - an author reminder for revision due dates.

    All N values go in config with defaults, for example 7/3/0 days. The actual numbers are TO CONFIRM.

### Anonymity

- **Single anonymous** (reviewer hidden from author) must always work. Authors see "Reviewer 1", "Reviewer 2", never names or e-mails, and that includes file names and e-mail headers.
- **Double anonymous** is a big advantage of building the manuscript in the app. Title page data (authors, affiliations, corresponding e-mail, acknowledgements, funding) live in **structured fields outside the body editor**, so the reviewer view and reviewer PDF can simply leave them out.
    - Remaining risks are self-citations and identifying details in the body. Tell authors to anonymise these, and add an admin checklist item for them.
    - Strip document metadata from author-uploaded supplementary files, or at least warn about it. Do the same for reviewer uploads.
- Which model applies is **TO CONFIRM.** The site, its editorial policy page and DOAJ disagree. Make it a config value: `review_model = single_anonymous | double_anonymous`.
- By default, reviewers do not see each other's identities.

### Decision letters

- Use editable templates: Mailable plus markdown templates, either in lang files or in a DB table.
- The admin's draft is pre-filled with the reviewers' comments to the author, labelled "Reviewer 1" etc. **Confidential comments are never inserted.** The admin edits the draft and then sends it.
- Store the exact text that was sent as part of the audit event.

### Author declarations at submission (standard practice)

- Originality, and that the paper is not under consideration elsewhere.
- All authors approve the submission.
- Competing interests.
- Funding.
- Ethics approval and informed consent, where applicable.
- Data availability.
- Use of AI tools. COPE's position is that AI cannot be an author and its use must be disclosed.
- Licence/copyright agreement (the licence is TO CONFIRM).
- APC acknowledgement, if the fee is confirmed.
- Optional: suggested and opposed reviewers.

### What the audit trail must record

Use an append-only `submission_events` table with these columns:

- `submission_id`, `round`
- `actor_id`, `actor_role`
- `type`
- `from_status`, `to_status`
- `payload` (JSON)
- `created_at`

There is no update or delete path in the model (enforce this in the model and policy). Record these events:

- every status change and decision, with the letter text;
- submission of each version, with the version id and a content hash;
- reviewer invited, accepted or declined (with reason), and COI declared;
- review submitted, unlocked or cancelled;
- due dates changed;
- reminders sent;
- files uploaded or soft-deleted, with the visibility flag;
- comments posted;
- payment status changes (who, amount, reference);
- role changes;
- withdrawals.

Also add an `email_log` table recording recipient, template, submission and time. Editors usually ask "did the reviewer get the mail?", and this answers it.

The **"Track changes" status history** in the UI is a timeline rendered from this table.

---

## B. Structured manuscript editor (React 19)

|                                           | **TipTap v3**                                                                                                                                                             | Lexical                                    | BlockNote                                                                               | Plate                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------- |
| Engine                                    | ProseMirror                                                                                                                                                               | Meta's own                                 | ProseMirror/TipTap                                                                      | Slate                            |
| Licence                                   | Core MIT. Some features are paid (Comments, Snapshots/compare, AI, collaboration)                                                                                         | MIT                                        | MPL-2.0 core. `@blocknote/xl-*` (exporters, multi-column, AI) is GPL/AGPL or commercial | MIT. Some templates are paid     |
| Version seen (Nov 2026)                   | `@tiptap/extension-table` 3.26.x (MIT)                                                                                                                                    | 0.40 (still 0.x)                           | 0.5x (0.54)                                                                             | v49+ (`platejs`)                 |
| Constrained schema                        | **Best.** ProseMirror content expressions (e.g. `content: 'section+'`) enforce structure, and paste or import is filtered through the schema                              | Done in code; no declarative content model | Block model aimed at Notion-style editing; hard to restrict                             | Done in code through normalizers |
| Tables with merged cells                  | TableKit (`prosemirror-tables`): merge/split, header cells, column resize. Mature                                                                                         | `$mergeCells` exists                       | Basic tables                                                                            | `enableMerging`                  |
| Sub/superscript, special characters, math | Official extensions. **Mathematics (KaTeX) was made MIT** in mid-2025, along with UniqueID, FileHandler, TableOfContents, DragHandle, Details, Emoji, InvisibleCharacters | Possible, but you build more yourself      | Limited                                                                                 | Plugins exist                    |
| Server-side HTML                          | `@tiptap/static-renderer` (JS). `ueberdosis/tiptap-php` exists; its v3 compatibility is unverified **(verify)**                                                           | Needs a headless DOM                       | JS exporters                                                                            | JS                               |

**Recommendation: TipTap v3, using only MIT packages.** Pin exact versions on install.

Reasons:

- Its schema model is the only one that natively enforces "every paper looks the same".
- `prosemirror-tables` is the most mature table implementation of the four.
- The extensions needed here, including math, are now free.
- It fits Tailwind and Radix UI well.

Avoid the paid packages: Comments, Snapshot Compare, Collaboration and AI Toolkit. The compare utility in TipTap's docs is part of the paid AI Toolkit.

**Design:**

- **Do not put the whole paper in one editor.** Split it into three parts:
    1. **Structured form fields:** article type, title, short running title (the PDF needs one), authors (repeatable rows with ORCID, affiliation numbers and corresponding flag), affiliations, abstract (an editor allowing only sub/superscript and italic), keywords (chips), received/accepted dates (filled by the system), acknowledgements, funding, declarations.
    2. **Body editor:** top level is `section+`. A section has a heading (the template supplies preset section names per article type) plus blocks (paragraph, H3/H4 subheading, list, `tableFigure`, `figure`, equation).
        - `tableFigure` content = `tableCaption table tableFootnotes`. Number tables automatically: "Table 1."
        - `figure` = `image figcaption`.
        - Marks: bold, italic, sub, sup and link only. No font, colour or size controls.
    3. **Reference list:** structured rows (authors, year, title, journal, volume, pages, DOI), or one row per reference plus a DOI lookup through Crossref later. Format to the journal's Harvard style when rendering.
        - In-text citations: phase 1 is plain text "(Author, year)" plus a check that every cited author–year matches a reference. A linked `citation` inline node is phase 2.
- **Paste from Word:** use `transformPastedHTML` to strip `mso-*` styles, `<o:p>` and empty spans. Map bold/italic/sub/sup; the schema throws away everything else.
- **Storage:** TipTap JSON is the source of truth in a `json` column, with UniqueID on block nodes. HTML is a derived rendering.
- **Server-side HTML rendering:** write a **small PHP renderer** for the constrained schema, about 20 node types. It is deterministic and unit-tested, and it runs at request time without Node.
    - The same renderer feeds the reviewer view, the PDF and the diff.
    - Alternative: `ueberdosis/tiptap-php` with custom node classes. Test it against v3 JSON first.
    - Run every rendering through a sanitiser (`symfony/html-sanitizer`) anyway.
- **Inertia SSR risk:** TipTap must not render on the server. Use `useEditor({ immediatelyRender: false })` and/or mount the editor only on the client.
- **React Compiler:** the project uses it. Test it against the editor component, or opt out with `'use no memo'` if re-render bugs appear.

---

## C. PDF generation

Requirements from section 0:

- Different header on the first page.
- Running heads that differ on left and right pages.
- **Page numbers starting at the article's issue page.**
- Corresponding-author footnote on page 1.
- Table headers repeated across page breaks; no break inside a caption.
- Cyrillic.
- Ubuntu server with PHP 8.3 and Node 22.

| Option                                                      | Strengths                                                                                                                                                                                                                                                      | Weaknesses                                                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chromium via spatie/laravel-pdf v2 (Browsershot driver)** | Uses the same engine as the web preview. Chrome 131+ draws `@page` margin boxes natively, including `counter(page)` and `:left`/`:right`                                                                                                                       | No `string-set` and no CSS footnotes. `counter-reset` of the page counter is not documented (**verify**). Heavy Chrome binary on the server |
| **Gotenberg** (spatie v2.1+ driver)                         | Docker service with Chromium, and LibreOffice for DOCX→PDF                                                                                                                                                                                                     | Same Chromium limits. Needs Docker                                                                                                          |
| **Paged.js + Chromium**                                     | Fullest Paged Media polyfill: running elements, `string-set`, page counter reset, footnotes                                                                                                                                                                    | Moving to a breaking 2.0 under an NLnet grant; npm releases slowed (Snyk marked it inactive). Slower, and its maintenance is uncertain      |
| **WeasyPrint** (spatie v2 driver)                           | Built for print. `@page :first/:left/:right`, margin boxes, named pages, `counter-reset: page N` inside `@page` (see note below the table), `string-set`. Footnote support was added in v54, to my knowledge (**verify**). No browser, about 1–3 s per article | Python dependency. No JS, so math must be pre-rendered to HTML/SVG on the server. **CVE fixed in v69: pin ≥ 69** (Debian lists 69 and 70)   |
| **Typst**                                                   | Best typography, very fast, tables with colspan/rowspan                                                                                                                                                                                                        | Needs a second renderer (JSON → Typst markup) and a separate template language. No HTML/CSS reuse                                           |

Note on `counter-reset` in WeasyPrint: one WeasyPrint issue thread reports that a page-level reset can stop the counter from incrementing, so test this early.

**Recommendation: WeasyPrint (≥ 69) through `spatie/laravel-pdf` v2's WeasyPrint driver,** queued as a job. Keep the driver switchable in config so Browsershot remains a fallback.

- The print layout goes in a single print stylesheet driven by `@page` rules, fed the same HTML that the PHP renderer produces.
- Generate PDFs when a version is frozen and for the production proof, never on every keystroke. The author's live preview is HTML styled with the same CSS on screen.
- **First task: a 1-day spike that reproduces pp. 1–2 and one table page of 71_2_001.** It must check:
    - start page 3, with even/odd running heads;
    - the "*email" footnote on page 1;
    - a table header repeating across a page break;
    - Macedonian text.

    If the spike fails, fall back to Chromium plus Paged.js. Typst is the option to use if typography quality matters more than reusing HTML.

**Fonts** (Times New Roman cannot be redistributed):

- **Liberation Serif:** SIL OFL 1.1, metrically compatible with Times New Roman, covers WGL4 (Cyrillic including Ѓ Ќ Ѕ Ј Љ Њ, and Greek for μ, α, β), packaged as `fonts-liberation2` on Ubuntu. **This is the default.**
- **STIX Two Text** (OFL): a better text and math face if the editors accept a slightly different look.
- **Macedonian italic** forms (б г д п т) need an OpenType `locl` feature plus `lang="mk"`. Liberation probably does not have it (**verify**). If the editors care, test Noto Serif or PT Serif. Times New Roman in Word does not show these forms either, so it matters little for English-language papers.
- Install the fonts as files on the server and reference them with `@font-face`, not as system fonts. Embed subsets in the PDF.

---

## D. "Track changes"

1. **Status history: build it.** It comes almost free from `submission_events` (section A). Show it as a timeline per submission (who, what, when, round, decision, letter). Authors see a reduced version without reviewer identities or confidential content.
2. **Version snapshots and diff: build it.**
    - The author's working draft can be changed freely. On submit or resubmit, freeze a `manuscript_versions` row with: round, JSON, rendered HTML, PDF path, SHA-256 hash and submitted_at. Reviewers always see a frozen version.
    - **How to diff:** match blocks across versions by their UniqueID attribute. Show added and removed blocks whole. Inside changed blocks, do a word-level diff with **jsdiff** (`diff` npm, BSD-3) and render `<ins>`/`<del>` in React. Show changed tables as cell-by-cell or before/after.
    - Simpler server-side alternative: diff the rendered HTML with `caxy/php-htmldiff` (it has a table mode; check that it is still maintained).
    - `prosemirror-changeset` works from recorded steps, not from two snapshots, so it is the wrong tool for comparing two versions.
    - Also require a point-by-point **"Response to reviewers"** field or file when resubmitting. That, not a diff, is what editors actually expect.
3. **Inline reviewer annotations: phase 2.**
    - Phase 1: general comments, the confidential/author split, and file uploads (reviewers can upload an annotated PDF or DOCX).
    - Phase 2: comments anchored to a block of the **frozen** version (block UniqueID plus a W3C TextQuoteSelector: exact/prefix/suffix). This is cheap because the text never changes.
    - **Do not build Word-style suggestion mode** (tracked insertions and deletions while editing). TipTap's version is paid, open-source alternatives are immature, and it is a lot of work for little value here.

---

## E. DOCX import and export

- **Import (mammoth.js, BSD-2): worth it as an optional "Import from Word" for authors.**
    - Use a style map that turns Heading 1/2 into sections and subheadings.
    - What it handles: footnotes and endnotes come through, tables keep their structure but lose their formatting (which is fine, because our template styles them), and images arrive inline as base64.
    - What needs work: upload the images to storage. Merged cells and OMML equations are unreliable (**verify**; expect equations to be dropped).
    - Run it on the client, then put the HTML through the TipTap schema (unknown content is dropped), and the author fixes structure and metadata.
    - Effort: about 1–2 days. Tell authors the result is approximate.
- **Export: decide with the editors.** The current production galleys are made in **Word** (the PDF metadata shows MS Word 2019). If typesetting stays in Word, a DOCX of the accepted manuscript built on a `reference.docx` template is very valuable.
    - **Pandoc** (HTML → DOCX with `--reference-doc`) gives the best fidelity for the effort. It is GPL, but run as a separate binary, so its licence does not apply to the app. Support for merged cells in its DOCX writer needs checking (**verify**).
    - The `docx` npm library (MIT) gives full control but needs a lot of code.
    - Avoid `phpoffice/phpword` for this: its table styling is weak.
    - If the app's WeasyPrint PDF becomes the official galley, DOCX export drops to "nice to have".

---

## Summary of recommendations and risks

| Area          | Pick                                                                                                                 | Main risk                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Workflow      | 10-status enum machine, one transition service, append-only events, payment as a separate field                      | Scope creep. Leave copyediting and proofs as one `in_production` stage at first |
| Reviewers     | Hashed-token invitation, due dates, COI on accept, two comment fields, file visibility flags, daily reminder command | Leaking identities through files and e-mail headers. Test anonymisation         |
| Editor        | TipTap v3, MIT packages only; metadata in form fields, body in a constrained schema, structured references           | SSR/React Compiler interaction; pin versions; never install `@tiptap-pro`       |
| HTML          | Own PHP renderer from JSON, then sanitiser                                                                           | Keeping it in sync with the editor schema. Share one schema fixture in tests    |
| PDF           | WeasyPrint ≥ 69 through spatie/laravel-pdf v2, queued; Liberation Serif                                              | Page-counter/footnote edge cases. Spike first, Chromium/Paged.js fallback       |
| Track changes | Event timeline + frozen versions + block-aligned jsdiff + response letter                                            | Matching tables across versions                                                 |
| DOCX          | Import with mammoth (optional); export only if the editors keep Word typesetting                                     | Equations and merged cells                                                      |
| Roles/auth    | Fortify registration on for authors (with verification), reviewers by invitation only, admin by seeder or promotion  | Role checks everywhere. Use Policies and test them                              |

**TO CONFIRM with the editors** (add to `config/journal.php`):

- review model (single or double anonymous);
- APC amount and timing, and whether `published` requires payment;
- article types and their required sections;
- trim size (205 × 287 mm vs A4);
- review and reminder deadlines;
- licence;
- whether production stays in Word.

Sources:

- [OJS 3.1 editorial workflow](https://docs.pkp.sfu.ca/learning-ojs/3.1/en/editorial-workflow)
- [OJS 3.4 workflow settings](https://docs.pkp.sfu.ca/learning-ojs/en/settings-workflow)
- [PKP forum: reviewer recommendation choices](https://forum.pkp.sfu.ca/t/ojs-reviewer-recommendation-choices/4281)
- [Editorial Manager automated reviewer reminders](https://www.elsevier.support/publishing/answer/how-are-automated-reviewer-reminders-sent-from-editorial-manager)
- [Editorial Manager automatic uninvite](https://www.elsevier.support/publishing/answer/how-can-reviewers-be-automatically-uninvited-or-unassigned-in-editorial-manager)
- [COPE ethical guidelines for peer reviewers v2](https://publicationethics.org/sites/default/files/cope-ethical-guidelines-peer-reviewers-v2_0.pdf)
- [TipTap: open-sourcing Pro extensions (6 Jun 2025)](https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap)
- [TipTap Pro licence](https://tiptap.dev/docs/pro-license)
- [@tiptap/extension-table on socket.dev](https://socket.dev/npm/package/@tiptap/extension-table)
- [tiptap-php](https://github.com/ueberdosis/tiptap-php)
- [BlockNote XL commercial licence](https://www.blocknotejs.org/legal/blocknote-xl-commercial-license)
- [Lexical table API](https://www.mintlify.com/facebook/lexical/api/packages/table)
- [Plate table docs](https://platejs.org/docs/table)
- [Chrome 131 print margin boxes](https://developer.chrome.com/blog/print-margins)
- [spatie/laravel-pdf v2 drivers](https://laravel-news.com/driver-based-architecture-in-spaties-laravel-pdf-v2)
- [spatie/laravel-pdf v2 WeasyPrint driver](https://spatie.be/docs/laravel-pdf/v2/drivers/using-the-weasyprint-driver)
- [WeasyPrint on the Debian tracker (versions, CVE)](https://tracker.debian.org/pkg/weasyprint)
- [WeasyPrint page counter issue](https://git.tdem.in/Kozea/WeasyPrint/issues/2114)
- [Paged.js: "A new chapter in Paged.js life"](https://pagedjs.org/posts/en/a-new-chapter-in-paged.js-life/)
- [Snyk advisor: pagedjs](https://snyk.io/advisor/npm-package/pagedjs)
- [ProseMirror forum: diffing two documents](https://discuss.prosemirror.net/t/how-to-diff-two-documents/1947)
- [TipTap compare utilities](https://tiptap.dev/docs/compare/api-reference/utilities)
- [mammoth.js README](https://cdn.jsdelivr.net/npm/mammoth@1.13.0/README.md)
- [Liberation fonts (Wikipedia)](https://en.wikipedia.org/wiki/Liberation_fonts)
