<?php

namespace App\Manuscripts;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * The manuscript content document (`ManuscriptContent` in
 * resources/js/types/manuscript.ts): a new draft, and normalising what the
 * editor sends so only the known shape is ever stored. Rich-text fields stay
 * TipTap JSON; the renderer allowlists their nodes and marks on output.
 */
final class Content
{
    public const SCHEMA = 1;

    /** @return array<string, mixed> */
    public static function blank(string $type, string $language, User $author): array
    {
        $affiliationId = (string) Str::uuid();
        $sections = [];

        foreach (Template::sections($type, $language) as $section) {
            $sections[] = [
                'key' => $section['free'] ? 'custom-'.Str::uuid() : $section['key'],
                'heading' => $section['heading'] ?? '',
                'body' => self::emptyDoc(),
            ];
        }

        return [
            'schema' => self::SCHEMA,
            'title' => null,
            'runningTitle' => '',
            'abstract' => null,
            'keywords' => [],
            'authors' => [[
                'id' => (string) Str::uuid(),
                'givenName' => (string) $author->given_name,
                'familyName' => (string) $author->family_name,
                'givenNameAlt' => '',
                'familyNameAlt' => '',
                'email' => $author->email,
                'orcid' => (string) $author->orcid,
                'phone' => (string) $author->phone,
                'affiliations' => [$affiliationId],
                'corresponding' => true,
            ]],
            'affiliations' => [[
                'id' => $affiliationId,
                'text' => trim(implode(', ', array_filter([$author->department, $author->affiliation, $author->city]))),
                'textAlt' => '',
            ]],
            'sections' => $sections,
            'acknowledgements' => null,
            'conflictOfInterest' => (string) config("manuscript.defaults.conflict_of_interest.{$language}", ''),
            'funding' => '',
            'references' => null,
            'summary' => ['title' => null, 'abstract' => null, 'keywords' => []],
        ];
    }

    /** @return array<string, mixed> */
    public static function emptyDoc(): array
    {
        return ['type' => 'doc', 'content' => [['type' => 'paragraph']]];
    }

    /**
     * Keep only the known fields, with the right types and sane lengths.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalise(array $input): array
    {
        $doc = fn (mixed $value) => is_array($value) && ($value['type'] ?? null) === 'doc' ? $value : null;
        $string = fn (mixed $value, int $max) => is_string($value) ? Str::limit(trim($value), $max, '') : '';
        $keywords = fn (mixed $value) => array_values(array_slice(array_filter(
            array_map(fn ($k) => is_string($k) ? Str::limit(trim($k), 80, '') : '', is_array($value) ? $value : []),
            fn (string $k) => $k !== '',
        ), 0, 20));

        $affiliations = [];

        foreach (array_slice(is_array($input['affiliations'] ?? null) ? $input['affiliations'] : [], 0, 30) as $a) {
            if (is_array($a) && is_string($a['id'] ?? null)) {
                $affiliations[] = [
                    'id' => Str::limit($a['id'], 64, ''),
                    'text' => $string($a['text'] ?? '', 500),
                    'textAlt' => $string($a['textAlt'] ?? '', 500),
                ];
            }
        }

        $affiliationIds = array_column($affiliations, 'id');
        $authors = [];

        foreach (array_slice(is_array($input['authors'] ?? null) ? $input['authors'] : [], 0, 60) as $a) {
            if (! is_array($a) || ! is_string($a['id'] ?? null)) {
                continue;
            }

            $authors[] = [
                'id' => Str::limit($a['id'], 64, ''),
                'givenName' => $string($a['givenName'] ?? '', 100),
                'familyName' => $string($a['familyName'] ?? '', 100),
                'givenNameAlt' => $string($a['givenNameAlt'] ?? '', 100),
                'familyNameAlt' => $string($a['familyNameAlt'] ?? '', 100),
                'email' => mb_strtolower($string($a['email'] ?? '', 255)),
                'orcid' => $string($a['orcid'] ?? '', 19),
                'phone' => $string($a['phone'] ?? '', 40),
                'affiliations' => array_values(array_intersect(
                    array_filter((array) ($a['affiliations'] ?? []), 'is_string'),
                    $affiliationIds,
                )),
                'corresponding' => (bool) ($a['corresponding'] ?? false),
            ];
        }

        $sections = [];

        foreach (array_slice(is_array($input['sections'] ?? null) ? $input['sections'] : [], 0, 40) as $s) {
            if (is_array($s) && is_string($s['key'] ?? null)) {
                $sections[] = [
                    'key' => Str::limit($s['key'], 80, ''),
                    'heading' => $string($s['heading'] ?? '', 200),
                    'body' => $doc($s['body'] ?? null) ?? self::emptyDoc(),
                ];
            }
        }

        $summary = is_array($input['summary'] ?? null) ? $input['summary'] : [];

        return [
            'schema' => self::SCHEMA,
            'title' => $doc($input['title'] ?? null),
            'runningTitle' => $string($input['runningTitle'] ?? '', (int) config('manuscript.running_title_max', 80)),
            'abstract' => $doc($input['abstract'] ?? null),
            'keywords' => $keywords($input['keywords'] ?? []),
            'authors' => $authors,
            'affiliations' => $affiliations,
            'sections' => $sections,
            'acknowledgements' => $doc($input['acknowledgements'] ?? null),
            'conflictOfInterest' => $string($input['conflictOfInterest'] ?? '', 2000),
            'funding' => $string($input['funding'] ?? '', 2000),
            'references' => $doc($input['references'] ?? null),
            'summary' => [
                'title' => $doc($summary['title'] ?? null),
                'abstract' => $doc($summary['abstract'] ?? null),
                'keywords' => $keywords($summary['keywords'] ?? []),
            ],
        ];
    }

    /**
     * The editorial-office-only data (`SubmissionData`).
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normaliseSubmission(array $input): array
    {
        $reviewers = [];

        foreach (array_slice(is_array($input['suggestedReviewers'] ?? null) ? $input['suggestedReviewers'] : [], 0, 10) as $r) {
            if (is_array($r)) {
                $reviewers[] = [
                    'name' => Str::limit(trim((string) ($r['name'] ?? '')), 200, ''),
                    'affiliation' => Str::limit(trim((string) ($r['affiliation'] ?? '')), 500, ''),
                    'email' => Str::limit(mb_strtolower(trim((string) ($r['email'] ?? ''))), 255, ''),
                ];
            }
        }

        $declarations = [];
        $given = is_array($input['declarations'] ?? null) ? $input['declarations'] : [];

        foreach (array_keys((array) config('manuscript.declarations')) as $key) {
            $declarations[$key] = (bool) ($given[$key] ?? false);
        }

        return [
            'suggestedReviewers' => $reviewers,
            'coverLetter' => Str::limit(trim((string) ($input['coverLetter'] ?? '')), 5000, ''),
            'declarations' => $declarations,
            'responseToReviewers' => Str::limit(trim((string) ($input['responseToReviewers'] ?? '')), 60000, ''),
        ];
    }

    /** @return array<string, mixed> */
    public static function blankSubmission(): array
    {
        return self::normaliseSubmission([]);
    }
}
