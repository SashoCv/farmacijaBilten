<?php

namespace App\Journal;

use App\Models\Issue;
use Illuminate\Support\Facades\Cache;

/**
 * Site-wide facts derived from the catalogue, cached because the header and
 * footer need them on every request. Call flush() after importing content.
 */
final class Journal
{
    private const KEY = 'journal.pointers';

    /** Slug of the newest published regular issue. */
    public static function currentIssueSlug(): ?string
    {
        return self::pointers()['current'];
    }

    /** Slug of the newest published supplement. */
    public static function featuredSupplementSlug(): ?string
    {
        return self::pointers()['supplement'];
    }

    /**
     * Journal facts from config/journal.php in the shape shared with the
     * frontend as the `journal` prop (`JournalFacts` in resources/js/types/journal.ts).
     *
     * @return array<string, mixed>
     */
    public static function facts(): array
    {
        $c = config('journal');
        $apc = $c['apc'] ?? null;

        return [
            'nameEn' => $c['name_en'],
            'nameMk' => $c['name_mk'],
            'abbrev' => $c['abbrev'],
            'issnPrint' => $c['issn_print'],
            'issnOnline' => $c['issn_online'],
            'doiPrefix' => $c['doi_prefix'],
            'publisher' => [
                'nameEn' => $c['publisher']['name_en'],
                'nameMk' => $c['publisher']['name_mk'],
                'abbrev' => $c['publisher']['abbrev'],
                'email' => $c['publisher']['email'],
                'url' => $c['publisher']['url'],
                'address' => $c['publisher']['address'],
            ],
            'coPublisher' => [
                'nameEn' => $c['co_publisher']['name_en'],
                'nameMk' => $c['co_publisher']['name_mk'],
                'url' => $c['co_publisher']['url'],
            ],
            'address' => [
                'organisation' => $c['address']['organisation'],
                'street' => $c['address']['street'],
                'postalCode' => $c['address']['postal_code'],
                'city' => $c['address']['city'],
                'country' => $c['address']['country'],
                'countryCode' => $c['address']['country_code'],
            ],
            'editorialEmail' => $c['editorial_email'],
            'phone' => $c['phone'],
            'editor' => [
                'name' => $c['editor']['name'],
                'title' => $c['editor']['title'],
                'role' => $c['editor']['role'],
                'signature' => $c['editor']['signature'],
            ],
            'licence' => [
                'name' => $c['licence']['name'],
                'url' => $c['licence']['url'],
            ],
            'apc' => $apc ? [
                'amount' => $apc['amount'],
                'currency' => $apc['currency'],
                'charged' => $apc['charged'],
            ] : null,
            'reviewModel' => $c['review_model'],
            'frequency' => $c['frequency'],
            'foundedYear' => $c['founded_year'],
            'languages' => $c['languages'],
            'openAccess' => $c['open_access'],
            'indexing' => array_map(fn (array $i) => [
                'key' => $i['key'],
                'name' => $i['name'],
                'label' => $i['label'],
                'url' => $i['url'],
                'logo' => $i['logo'],
            ], $c['indexing']),
            'ebscoStatement' => $c['ebsco_statement'],
            'indexingStatement' => $c['indexing_statement'],
        ];
    }

    public static function flush(): void
    {
        Cache::forget(self::KEY);
    }

    /**
     * @return array{current: string|null, supplement: string|null}
     */
    private static function pointers(): array
    {
        return Cache::rememberForever(self::KEY, fn () => [
            'current' => Issue::published()
                ->where('kind', Issue::KIND_ISSUE)
                ->latestFirst()
                ->value('slug'),
            'supplement' => Issue::published()
                ->where('kind', Issue::KIND_SUPPLEMENT)
                ->latestFirst()
                ->value('slug'),
        ]);
    }
}
