<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Journal facts
    |--------------------------------------------------------------------------
    |
    | The single source of truth for facts about the journal, read everywhere
    | through config('journal.*'): header, footer, About, article sidebar,
    | meta tags, feeds and OAI-PMH. They are shared with the frontend as the
    | `journal` prop (App\Journal\Journal::facts(), type JournalFacts).
    |
    | Values are taken from the journal's own website. Where sources disagree
    | or the site is silent, the value carries a "TO CONFIRM" comment and must
    | be confirmed by the editors before it is presented as settled.
    |
    */

    'name_en' => 'Macedonian Pharmaceutical Bulletin',
    'name_mk' => 'Македонски фармацевтски билтен',
    'abbrev' => 'Maced. Pharm. Bull.',

    'issn_print' => '1409-8695',
    'issn_online' => '1857-8969',
    'doi_prefix' => '10.33320',

    'publisher' => [
        'name_en' => 'Macedonian Pharmaceutical Association',
        'name_mk' => 'Македонско фармацевтско друштво',
        'abbrev' => 'MFD',
        'email' => 'info@mfd.org.mk',
        'url' => 'https://mfd.org.mk',
        // As on the old contact page ("Marshal Tito 13B/8, Skopje, Macedonia").
        'address' => 'Marshal Tito 13B/8, Skopje',
    ],

    'co_publisher' => [
        'name_en' => 'Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje',
        'name_mk' => 'Фармацевтски факултет, Универзитет „Св. Кирил и Методиј“ во Скопје',
        'url' => 'https://ff.ukim.edu.mk',
    ],

    // Editorial office address.
    // TO CONFIRM: the editorial board page says "Majka Tereza 47, 1000 Skopje",
    // the contact page says "Majka Tereza 17, P. O. Box 36, Skopje".
    'address' => [
        'organisation' => 'Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje',
        'street' => 'Majka Tereza 47',
        'postal_code' => '1000',
        'city' => 'Skopje',
        'country' => 'North Macedonia',
        'country_code' => 'MK',
    ],

    'editorial_email' => 'magl@ff.ukim.edu.mk',
    // TO CONFIRM: no phone number is published on the old site.
    'phone' => null,

    // Signs the "Editor's words" ("Sincerely, Professor Marija Glavas Dodov").
    'editor' => [
        'name' => 'Marija Glavas Dodov',
        'title' => 'Professor',
        // TO CONFIRM: the editorial board page (last updated 2020) lists her as
        // Secretary and Svetlana Kulevanova as Editor-in-Chief.
        'role' => null,
        'signature' => '/media/uploads/2025/09/Potpis_Glavas-e1757065020400.png',
    ],

    // TO CONFIRM: the instructions for authors link CC BY 3.0 (kept here because
    // it is the journal's own statement), while the DOAJ record says CC BY 4.0.
    'licence' => [
        'name' => 'CC BY 3.0',
        'url' => 'https://creativecommons.org/licenses/by/3.0/',
    ],

    // TO CONFIRM: /guidelines/article-processing-charges says 50 EUR "upon
    // acceptance of the article"; the DOAJ record says the journal has no APC.
    'apc' => [
        'amount' => 50,
        'currency' => 'EUR',
        'charged' => 'on acceptance',
    ],

    // TO CONFIRM: the review policies page says "blind peer review", the
    // editorial policies page says "double-blind", DOAJ says single anonymous.
    'review_model' => 'Blind peer review',

    // TO CONFIRM: not stated on the old site.
    'frequency' => null,
    // TO CONFIRM: not stated on the old site.
    'founded_year' => null,

    // From the instructions for authors: research papers in English, professional
    // papers and other contributions may be in Macedonian.
    'languages' => ['en', 'mk'],
    'open_access' => true,

    // Logos are on the "journal" disk (mirrored from the old site's wp-includes/images).
    'indexing' => [
        [
            'key' => 'doaj',
            'name' => 'DOAJ',
            'label' => 'Directory of Open Access Journals',
            'url' => 'https://doaj.org/toc/1857-8969',
            'logo' => '/media/images/doaj_logo.jpg',
        ],
        [
            'key' => 'ebsco',
            'name' => 'EBSCO',
            'label' => 'EBSCOhost – Academic Search',
            // TO CONFIRM: the old site links the EBSCO home page, not the title record.
            'url' => 'https://www.ebsco.com/',
            'logo' => '/media/images/ebsco_logo.jpg',
        ],
        [
            'key' => 'crossref',
            'name' => 'Crossref',
            'label' => 'DOI prefix 10.33320',
            // TO CONFIRM: preferred public Crossref link for the journal.
            'url' => 'https://search.crossref.org/?q=1857-8969',
            'logo' => null,
        ],
    ],

    // Verbatim from the old home page (text widget next to the EBSCO logo).
    'ebsco_statement' => "Macedonian Pharmaceutical Association has entered into an electronic licensing relationship with EBSCO Information Services, the world's most prolific aggregator of full text journals, magazines and other sources",

    // Verbatim from the Editor's words.
    'indexing_statement' => 'The journal is indexed in DOAJ Directory and EBSCO Host – Academic Search database.',

    /*
    |--------------------------------------------------------------------------
    | Submissions
    |--------------------------------------------------------------------------
    */

    /*
    | Address that receives new manuscript submissions (with the file attached).
    | Set JOURNAL_SUBMISSIONS_EMAIL in .env to the editorial office's mailbox.
    */
    'submissions_email' => env('JOURNAL_SUBMISSIONS_EMAIL'),

    // Largest manuscript file accepted, in kilobytes.
    'submission_max_kb' => (int) env('JOURNAL_SUBMISSION_MAX_KB', 20480),

];
