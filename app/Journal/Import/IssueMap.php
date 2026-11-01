<?php

namespace App\Journal\Import;

use App\Models\Issue;

/**
 * Which issue each post on the old site represents.
 *
 * Regular issues follow the "volume-71-2" pattern; everything else is listed
 * explicitly because the old slugs are inconsistent (the post "volume-55" is
 * actually the Volume 53 abstract book, for example).
 */
final class IssueMap
{
    /**
     * Posts (and old addresses registered at Crossref as volume DOIs) that
     * only stand for a whole multi-issue volume. They lead to the archive.
     */
    private const CONTAINERS = [
        'volume-60', 'volume-61', 'volume-62', 'volume-63', 'volume-64',
        'volume-65', 'volume-66', 'volume-67', 'volume-68', 'volume-69',
    ];

    /** @var array<string, array{0: int, 1: string, 2: int|null, 3?: string}> */
    private const OVERRIDES = [
        'volume-55' => [53, Issue::KIND_ABSTRACTS, null, 'Fourth Congress of Pharmacy of Macedonia'],
        'volume-55-2' => [55, Issue::KIND_VOLUME, null],
        // Congress names from each supplement's preface.
        'volume-62-supp' => [62, Issue::KIND_SUPPLEMENT, 1, '6th Congress of Pharmacy'],
        'volume-66-supp-1' => [66, Issue::KIND_SUPPLEMENT, 1, '7th Congress of Pharmacy'],
        'volume-66-suppl-2' => [66, Issue::KIND_SUPPLEMENT, 2, 'CMAPSEEC 2020'],
        '68-supp-1' => [68, Issue::KIND_SUPPLEMENT, 1, '7th Congress of Pharmacy'],
        '68-supp-2' => [68, Issue::KIND_SUPPLEMENT, 2, 'CMAPSEEC 2022'],
        'volume-69-suppl-1' => [69, Issue::KIND_SUPPLEMENT, 1, '14th CESPT'],
        '72_3_2026-8cpm' => [72, Issue::KIND_SUPPLEMENT, 1, '8CPM'],
        // Crossref resource URLs for two supplement DOIs (…2020.66.03, …2023.69.03)
        // use the folder numbering, where "_3" is supplement 1.
        'volume-66-3' => [66, Issue::KIND_SUPPLEMENT, 1, '7th Congress of Pharmacy'],
        'volume-69-3' => [69, Issue::KIND_SUPPLEMENT, 1, '14th CESPT'],
    ];

    /**
     * Full congress titles and place/dates, as printed in each supplement's
     * preface (abstract book title page for Volume 53). Dates are reformatted
     * only. TO CONFIRM by the editors before they are shown as official names.
     *
     * @var array<array-key, array{full_title: string, location_dates: string|null}>
     */
    public const DETAILS = [
        // Title page: "Fourth Congress on Pharmacy of Macedonia with International Participation, Ohrid, R. Macedonia, September 26-30, 2007".
        '53' => ['full_title' => 'Fourth Congress on Pharmacy of Macedonia with International Participation', 'location_dates' => 'Ohrid, 26–30 September 2007'],
        // Preface; no place or dates are printed.
        '62-s1' => ['full_title' => 'Sixth Congress of Pharmacy in Macedonia with International Participation', 'location_dates' => null],
        // Preface: postponed because of COVID-19; the papers were published without the meeting.
        '66-s1' => ['full_title' => 'Seventh Congress of Pharmacy in North Macedonia with International Participation 2020', 'location_dates' => null],
        '66-s2' => ['full_title' => '11th Conference on Medicinal and Aromatic Plants of Southeast European Countries (CMAPSEEC 2020)', 'location_dates' => null],
        '68-s1' => ['full_title' => 'Seventh Congress of Pharmacy in North Macedonia with International Participation', 'location_dates' => 'Ohrid, 5–9 October 2022'],
        '68-s2' => ['full_title' => '11th Conference on Medicinal and Aromatic Plants of Southeast European Countries (CMAPSEEC 2022)', 'location_dates' => 'Ohrid, 6–10 October 2022'],
        '69-s1' => ['full_title' => '14th Central European Symposium on Pharmaceutical Technology (CESPT)', 'location_dates' => 'Ohrid, 28–30 September 2023'],
        '72-s1' => ['full_title' => '8th Congress of Pharmacy in North Macedonia with International Participation', 'location_dates' => 'Ohrid, 1–4 October 2026'],
    ];

    public const EARLY_ONLINE_POST = 'early-online';

    /**
     * @return array{slug: string, volume: int, kind: string, number: int|null, note: string|null, year: int}|null
     */
    public static function forPost(string $postSlug): ?array
    {
        if (in_array($postSlug, self::CONTAINERS, true) || $postSlug === self::EARLY_ONLINE_POST) {
            return null;
        }

        if (isset(self::OVERRIDES[$postSlug])) {
            $o = self::OVERRIDES[$postSlug];

            return self::make($o[0], $o[1], $o[2], $o[3] ?? null);
        }

        if (preg_match('/^volume-(\d+)-(\d)$/', $postSlug, $m)) {
            return self::make((int) $m[1], Issue::KIND_ISSUE, (int) $m[2]);
        }

        if (preg_match('/^volume-(\d+)$/', $postSlug, $m)) {
            return self::make((int) $m[1], Issue::KIND_VOLUME, null);
        }

        return null;
    }

    /**
     * Volume number of a post that stands for a whole volume ("volume-62" => 62),
     * or null.
     */
    public static function containerVolume(string $postSlug): ?int
    {
        return in_array($postSlug, self::CONTAINERS, true) && preg_match('/(\d+)$/', $postSlug, $m)
            ? (int) $m[1]
            : null;
    }

    /**
     * Volume number named by an old post slug ("volume-71-2", "68-supp-1",
     * "72_3_2026-8cpm"), used to point at the archive when the issue is gone.
     */
    public static function volumeOf(string $postSlug): ?int
    {
        return preg_match('/^(?:volume-)?(\d{2})(?:\D|$)/', $postSlug, $m) ? (int) $m[1] : null;
    }

    /**
     * Issue for an early-online PDF, from its folder: "Volume 72_1" is issue 1,
     * "_3" and "_4" are supplements 1 and 2 (the journal's own convention).
     *
     * @return array{slug: string, volume: int, kind: string, number: int|null, note: string|null, year: int}|null
     */
    public static function forFile(string $diskPath): ?array
    {
        if (! preg_match('#^volumes/Volume (\d+)_(\d)/#', $diskPath, $m)) {
            return null;
        }

        $part = (int) $m[2];

        return $part <= 2
            ? self::make((int) $m[1], Issue::KIND_ISSUE, $part)
            : self::make((int) $m[1], Issue::KIND_SUPPLEMENT, $part - 2);
    }

    /**
     * @return array{slug: string, volume: int, kind: string, number: int|null, note: string|null, year: int}
     */
    private static function make(int $volume, string $kind, ?int $number, ?string $note = null): array
    {
        $slug = match ($kind) {
            Issue::KIND_ISSUE => "{$volume}-{$number}",
            Issue::KIND_SUPPLEMENT => "{$volume}-s{$number}",
            default => (string) $volume,
        };

        return [
            'slug' => $slug,
            'volume' => $volume,
            'kind' => $kind,
            'number' => $number,
            'note' => $note,
            // One volume per year: Volume 71 is 2025.
            'year' => $volume + 1954,
        ];
    }
}
