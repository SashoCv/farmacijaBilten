<?php

/*
|--------------------------------------------------------------------------
| The manuscript template (docs/backoffice, research/manuscript-template-spec.md)
|--------------------------------------------------------------------------
|
| Article types, the fixed section skeleton of each, limits and the printed
| labels. Values marked TO CONFIRM wait for the editorial office; they are
| safe defaults taken from the Instructions for authors and recent issues.
|
*/

return [

    /*
    | Article types. `languages`: manuscript languages allowed for the type
    | (IFA: original papers, short communications and reviews in English;
    | professional papers may be in Macedonian). `skeleton`: a key from
    | `skeletons` below. `abstract_words`: soft limit (a warning, not a block).
    */
    'types' => [
        'original_scientific_paper' => [
            'label' => ['en' => 'Original scientific paper', 'mk' => 'Оригинален научен труд'], // mk TO CONFIRM
            'languages' => ['en'],
            'skeleton' => 'research',
            'abstract_words' => 250,
        ],
        'short_communication' => [
            'label' => ['en' => 'Short communication', 'mk' => 'Кратко соопштение'], // mk TO CONFIRM
            'languages' => ['en'],
            'skeleton' => 'research',
            'abstract_words' => 100,
            // Tables and figures together (IFA: "including 2 illustrations, figures or tables").
            'max_tables_and_figures' => 2,
        ],
        'review_paper' => [
            'label' => ['en' => 'Review paper', 'mk' => 'Прегледен труд'], // mk TO CONFIRM
            'languages' => ['en'],
            'skeleton' => 'review',
            'abstract_words' => 250, // TO CONFIRM: the IFA states no limit for reviews
        ],
        'professional_paper' => [
            'label' => ['en' => 'Professional paper', 'mk' => 'Стручен труд'],
            'languages' => ['en', 'mk'],
            'skeleton' => 'research',
            'abstract_words' => 250,
        ],
    ],

    /*
    | Section skeletons. Each section: `key`, printed `heading` per language,
    | `required`. `alternatives`: other headings the author may choose for the
    | same section. In the review skeleton, `free` marks where the author adds
    | their own titled sections (at least one).
    */
    'skeletons' => [
        'research' => [
            ['key' => 'introduction', 'heading' => ['en' => 'Introduction', 'mk' => 'Вовед'], 'required' => true],
            [
                'key' => 'methods',
                'heading' => ['en' => 'Material and methods', 'mk' => 'Материјал и методи'], // mk TO CONFIRM
                'alternatives' => [
                    ['en' => 'Materials and methods', 'mk' => 'Материјали и методи'],
                    ['en' => 'Experimental', 'mk' => 'Експериментален дел'],
                    ['en' => 'Theoretical background', 'mk' => 'Теоретска основа'],
                ],
                'required' => true,
            ],
            [
                'key' => 'results',
                'heading' => ['en' => 'Results and discussion', 'mk' => 'Резултати и дискусија'], // mk TO CONFIRM
                'required' => true,
            ],
            ['key' => 'conclusion', 'heading' => ['en' => 'Conclusion', 'mk' => 'Заклучок'], 'required' => true],
        ],
        'review' => [
            ['key' => 'introduction', 'heading' => ['en' => 'Introduction', 'mk' => 'Вовед'], 'required' => true],
            ['key' => 'free', 'free' => true, 'required' => true],
            ['key' => 'conclusion', 'heading' => ['en' => 'Conclusion', 'mk' => 'Заклучок'], 'required' => true],
        ],
    ],

    'keywords' => ['min' => 3, 'max' => 6],

    'running_title_max' => 80,

    // Labels printed in the article, per manuscript language.
    'labels' => [
        'en' => [
            'abstract' => 'Abstract',
            'keywords' => 'Key words',
            'acknowledgements' => 'Acknowledgements', // TO CONFIRM: "Acknowledgement" also appears
            'conflict_of_interest' => 'Conflict of interest',
            'funding' => 'Funding',
            'references' => 'References',
            'summary' => 'Резиме',
            'table' => 'Table',
            'received' => 'Received',
            'accepted' => 'Accepted',
        ],
        'mk' => [
            'abstract' => 'Апстракт',
            'keywords' => 'Клучни зборови',
            'acknowledgements' => 'Благодарност', // TO CONFIRM
            'conflict_of_interest' => 'Конфликт на интереси', // TO CONFIRM
            'funding' => 'Финансирање', // TO CONFIRM
            'references' => 'Литература',
            'summary' => 'Summary',
            'table' => 'Табела',
            'received' => 'Примено', // TO CONFIRM
            'accepted' => 'Прифатено', // TO CONFIRM
        ],
    ],

    // Default wording offered to the author (editable). TO CONFIRM.
    'defaults' => [
        'conflict_of_interest' => [
            'en' => 'The authors declare no conflict of interest.',
            'mk' => 'Авторите изјавуваат дека немаат конфликт на интереси.',
        ],
    ],

    // Submission declarations (IFA "Submission declaration" and checklist).
    'declarations' => [
        'original' => 'The work has not been published before and is not under consideration elsewhere.',
        'approved' => 'All authors have approved the manuscript and agree with its submission.',
        'permissions' => 'Permission has been obtained for any material reproduced from other sources.',
        'checked' => 'The manuscript has been spell- and grammar-checked.',
        'references' => 'All references in the text are in the reference list and vice versa.',
    ],

    // Suggested referees (IFA: names, addresses and e-mails of 3). TO CONFIRM whether optional.
    'suggested_reviewers' => 3,

    /*
    | PDF in the journal layout (WeasyPrint, docs/backoffice/spikes/pdf).
    | `python`: the interpreter that has WeasyPrint (runs resources/pdf/render.py,
    | which adds Macedonian hyphenation); when empty the `weasyprint` command is
    | used directly. Production: python3 -m venv /opt/weasyprint &&
    | /opt/weasyprint/bin/pip install weasyprint==70.0 → WEASYPRINT_PYTHON=/opt/weasyprint/bin/python
    */
    'pdf' => [
        'python' => env('WEASYPRINT_PYTHON'),
        'weasyprint' => env('WEASYPRINT_BIN', 'weasyprint'),
        'timeout' => (int) env('WEASYPRINT_TIMEOUT', 120),
    ],

    // Autosaved drafts larger than this are refused (bytes of JSON).
    'max_content_bytes' => 2_000_000,

];
