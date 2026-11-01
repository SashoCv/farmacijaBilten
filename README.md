# Macedonian Pharmaceutical Bulletin

Website of the **Macedonian Pharmaceutical Bulletin** (Македонски фармацевтски билтен), an open-access, peer-reviewed journal of the Macedonian Pharmaceutical Association and the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.

This repository is the rebuild of [bulletin.mfd.org.mk](https://bulletin.mfd.org.mk). The whole archive of the old WordPress site is mirrored into it: volumes 47 to 72, 1,283 articles, the editorial pages and every PDF. Metadata is read from the PDFs themselves.

> Ова е новата веб-страница на Македонскиот фармацевтски билтен: целата архива од стариот сајт, нов дизајн, двојазичен интерфејс (англиски / македонски) и поднесување ракописи преку веб.

## Features

- **Archive.** Every volume, issue and supplement with its table of contents, real covers and full-issue PDFs. Large congress supplements (300+ contributions) load as the reader scrolls.
- **Article pages.**
  - Authors and affiliations, publication history, DOI (shown as a link only when it is registered with Crossref) and keywords.
  - Abstract, an inline PDF viewer, and a cite dialog with Vancouver, APA, Harvard and Chicago styles plus BibTeX and RIS export.
- **Search.**
  - Covers titles, authors, keywords and abstracts.
  - Works in Latin or Cyrillic, with or without diacritics, and highlights the matched words.
  - Filters by year, volume, article type and issue type.
- **Editorial pages.**
  - About, Indexing, the editorial board (structured, with 32 members) and Contact.
  - Instructions for authors and the policies, each with an "On this page" table of contents.
  - Privacy and accessibility statements (drafts).
- **Manuscript submission.**
  - An online form for the manuscript, signed forms and suggested reviewers.
  - Notifies the editors and sends the author a receipt with a reference number.
  - Submissions are listed at `/admin/submissions` for editors.
- **Bilingual interface.** English by default and Macedonian through the language switch. Dates and labels are localized as well.
- **Scholarly metadata and SEO.**
  - Google Scholar (Highwire) and Dublin Core tags, plus JSON-LD.
  - Sitemaps, Atom feeds and an OAI-PMH 2.0 endpoint (`/oai`) for DOAJ and other harvesters.
- **Old URLs keep working.** PDFs keep their old paths (`/volumes/...`), and old WordPress addresses (`/volume-71-2/`) redirect permanently.

## Stack

- **Backend:** Laravel 13 (PHP 8.3+), SQLite, Laravel Fortify (editor sign-in).
- **Frontend:** React 19 + Inertia 3 with server-side rendering, TypeScript, Tailwind CSS 4, Vite+.
- **PDF tooling:** `pdftotext`, `pdfinfo` and `pdftoppm` from poppler-utils.

## Getting started

Requirements: PHP 8.3+ (with `pdo_sqlite` and `intl`), Composer, Node 22, and poppler-utils.

```bash
composer run setup        # installs dependencies, creates .env, migrates, builds
php artisan storage:link  # links /volumes, /downloads and /media to storage/app/journal
```

The journal's content is not in git. The PDFs (about 700 MB) and the database are rebuilt from the old site:

```bash
php artisan journal:import           # issues, articles, pages and all files, then PDF metadata and the search index
php artisan journal:repair-pages     # structured editorial pages and the editorial board
php artisan journal:repair-text      # encoding fixes, article types, languages
php artisan journal:sync-crossref    # which DOIs are registered with Crossref
php artisan journal:generate-covers  # issue covers and article thumbnails from the PDFs
```

Then run the app:

```bash
composer run dev          # PHP server, queue worker, logs and Vite with hot reload
```

The app runs at http://127.0.0.1:8000.

### Useful commands

| Command                                         | Purpose                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `php artisan test`                              | Run the test suite                                       |
| `npm run types:check`                           | TypeScript                                               |
| `npm run check`                                 | Lint and formatting (JS/TS)                              |
| `composer run lint`                             | PHP formatting (Pint)                                    |
| `npm run i18n:check`                            | Fail if any interface string lacks a Macedonian translation |
| `npm run build:ssr`                             | Production build (client + SSR)                          |
| `php artisan journal:create-editor EMAIL "Name"` | Create an editor account (public registration is off)    |
| `php artisan journal:verify-data`               | Check the imported data for problems                     |
| `php artisan journal:smoke`                     | Check a live article page (SSR, meta tags, assets)       |

## Project layout

| Path | Purpose |
| --- | --- |
| `app/Journal/Import` | Parsers for the old site's HTML and the PDF metadata extractor |
| `app/Journal/Seo` | Meta tags, JSON-LD, sitemaps, feeds and OAI-PMH |
| `app/Journal/Search` | Folded Latin/Cyrillic search index |
| `app/Console/Commands` | The `journal:*` commands |
| `config/journal.php` | Facts about the journal (ISSN, publisher, licence, indexing). Values marked `TO CONFIRM` need the editors' confirmation. |
| `resources/js/pages/journal` | Public pages |
| `resources/js/components/journal` | Shared UI |
| `resources/js/lang/mk.ts`, `lang/mk.json`, `lang/mk/validation.php` | Macedonian translations |
| `deploy/`, [`DEPLOY.md`](DEPLOY.md) | Server configuration and the production guide |

## Status

- **Public website:** done.
- **Editorial back-office** (the application behind the sign-in): to be built next.
- **Waiting on the editorial office:**
  - Confirm the facts marked `TO CONFIRM` in `config/journal.php`: address, current editors, licence version, APC, review model.
  - Supply official logos and the covers that are missing.
  - Deposit the unregistered DOIs with Crossref.

## Credits

Design and development: [Nexsol Labs](https://nexsollabs.com).

Content © Macedonian Pharmaceutical Association and Faculty of Pharmacy, UKIM. Articles are published open access under the licence stated by the journal.
