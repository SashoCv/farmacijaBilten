<?php

/*
|--------------------------------------------------------------------------
| Crossref (DOI registration)
|--------------------------------------------------------------------------
|
| The journal is Crossref member 18202 (Macedonian Pharmaceutical
| Association), prefix 10.33320. The depositor's name and e-mail and the
| automatic deposits are set by the editorial office in the back-office
| (Archive → DOI check). The account below is only needed to send deposits
| from the system; without it the XML is downloaded and uploaded at Crossref
| by hand. See docs/crossref.md.
|
*/

return [

    // Crossref account (a role such as "mfd/bulletin", or "email@…/role"). Secret: .env only.
    'username' => env('CROSSREF_USERNAME'),
    'password' => env('CROSSREF_PASSWORD'),

    // "test": Crossref's test system (nothing is registered); "live": real DOIs.
    'mode' => env('CROSSREF_MODE', 'test'),

    'endpoints' => [
        'test' => 'https://test.crossref.org',
        'live' => 'https://doi.crossref.org',
    ],

    /*
    | Where a DOI leads. "pdf": the article's PDF (/volumes/…), as in all the
    | earlier deposits; works on the old and the new website. "page": the
    | article page on the new website (Crossref's recommendation); switch to
    | it once the new website is live and deposit again.
    */
    'target' => env('CROSSREF_TARGET', 'pdf'),

    /*
    | The public address of the journal website that DOIs lead to. Fixed
    | (not APP_URL), so that a file made on a local copy never points DOIs
    | at that computer.
    */
    'site_url' => env('CROSSREF_SITE_URL', 'https://bulletin.mfd.org.mk'),

];
