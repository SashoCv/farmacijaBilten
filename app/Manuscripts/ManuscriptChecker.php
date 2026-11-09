<?php

namespace App\Manuscripts;

use App\Rules\Orcid;

/**
 * Checks a manuscript against the journal template before it is sent:
 * errors block submitting, warnings do not. Messages are in the reader's
 * language (`CheckIssue` in resources/js/types/manuscript.ts).
 */
final class ManuscriptChecker
{
    /** @var list<array{level: string, field: string, message: string}> */
    private array $issues = [];

    /**
     * @param  array<string, mixed>  $content
     * @param  array<string, mixed>  $submission
     * @return list<array{level: string, field: string, message: string}>
     */
    public static function check(array $content, array $submission, string $type, string $language): array
    {
        $checker = new self;
        $checker->front($content, $type);
        $checker->people($content);
        $checker->body($content, $type, $language);
        $checker->back($content);
        $checker->submission($submission);

        return $checker->issues;
    }

    /** @param  list<array{level: string}>  $issues */
    public static function hasErrors(array $issues): bool
    {
        foreach ($issues as $issue) {
            if ($issue['level'] === 'error') {
                return true;
            }
        }

        return false;
    }

    /** @param  array<string, string|int>  $replace */
    private function error(string $field, string $message, array $replace = []): void
    {
        $this->issues[] = ['level' => 'error', 'field' => $field, 'message' => __($message, $replace)];
    }

    /** @param  array<string, string|int>  $replace */
    private function warning(string $field, string $message, array $replace = []): void
    {
        $this->issues[] = ['level' => 'warning', 'field' => $field, 'message' => __($message, $replace)];
    }

    /** @param  array<string, mixed>  $c */
    private function front(array $c, string $type): void
    {
        if (Rich::text($c['title'] ?? null) === '') {
            $this->error('title', 'Add the title.');
        } elseif (str_ends_with(Rich::text($c['title']), '.')) {
            $this->warning('title', 'Titles have no final period.');
        }

        $words = Rich::words($c['abstract'] ?? null);
        $limit = (int) config("manuscript.types.{$type}.abstract_words", 250);

        if ($words === 0) {
            $this->error('abstract', 'Write the abstract.');
        } elseif ($words > $limit) {
            $this->warning('abstract', 'The abstract has :words words; the limit for this type of paper is :limit.', ['words' => $words, 'limit' => $limit]);
        }

        $this->keywords('keywords', (array) ($c['keywords'] ?? []));
    }

    /** @param  array<mixed>  $keywords */
    private function keywords(string $field, array $keywords): void
    {
        $min = (int) config('manuscript.keywords.min', 3);
        $max = (int) config('manuscript.keywords.max', 6);
        $count = count($keywords);

        if ($count < $min || $count > $max) {
            $this->error($field, 'Give :min to :max key words (now :count).', ['min' => $min, 'max' => $max, 'count' => $count]);
        }
    }

    /** @param  array<string, mixed>  $c */
    private function people(array $c): void
    {
        $authors = (array) ($c['authors'] ?? []);
        $affiliations = (array) ($c['affiliations'] ?? []);

        if ($authors === []) {
            $this->error('authors', 'Add at least one author.');
        }

        if ($affiliations === []) {
            $this->error('affiliations', 'Add at least one affiliation.');
        }

        $used = [];
        $corresponding = 0;

        foreach ($authors as $i => $author) {
            $field = 'authors.'.$author['id'];
            $n = $i + 1;

            if ($author['givenName'] === '' || $author['familyName'] === '') {
                $this->error($field, 'Author :n: give the given name and the family name.', ['n' => $n]);
            }

            if ($author['givenNameAlt'] === '' || $author['familyNameAlt'] === '') {
                $this->error($field, 'Author :n: give the name in the other script too (for the summary).', ['n' => $n]);
            }

            if ($author['affiliations'] === []) {
                $this->error($field, 'Author :n: choose at least one affiliation.', ['n' => $n]);
            }

            if ($author['orcid'] !== '' && ! Orcid::isValid($author['orcid'])) {
                $this->error($field, 'Author :n: the ORCID iD is not valid.', ['n' => $n]);
            }

            if ($author['email'] !== '' && filter_var($author['email'], FILTER_VALIDATE_EMAIL) === false) {
                $this->error($field, 'Author :n: the e-mail address is not valid.', ['n' => $n]);
            }

            if ($author['corresponding']) {
                $corresponding++;

                if ($author['email'] === '' || $author['phone'] === '') {
                    $this->error($field, 'Author :n is the corresponding author: give an e-mail address and a phone number.', ['n' => $n]);
                }
            }

            $used = [...$used, ...$author['affiliations']];
        }

        if ($authors !== [] && $corresponding === 0) {
            $this->error('authors', 'Mark the corresponding author.');
        }

        foreach ($affiliations as $i => $affiliation) {
            if ($affiliation['text'] === '') {
                $this->error('affiliations', 'Affiliation :n is empty.', ['n' => $i + 1]);
            } elseif ($affiliation['textAlt'] === '') {
                $this->error('affiliations', 'Affiliation :n: give it in the other language too (for the summary).', ['n' => $i + 1]);
            }

            if (! in_array($affiliation['id'], $used, true)) {
                $this->warning('affiliations', 'Affiliation :n is not used by any author.', ['n' => $i + 1]);
            }
        }
    }

    /** @param  array<string, mixed>  $c */
    private function body(array $c, string $type, string $language): void
    {
        $sections = (array) ($c['sections'] ?? []);
        $byKey = [];

        foreach ($sections as $section) {
            $byKey[$section['key']] = $section;
        }

        foreach (Template::sections($type, $language) as $skeleton) {
            if ($skeleton['free']) {
                $custom = array_filter($sections, fn (array $s) => str_starts_with($s['key'], 'custom-'));

                if ($custom === []) {
                    $this->error('sections', 'Add at least one section of your own between the introduction and the conclusion.');
                }

                foreach ($custom as $s) {
                    if ($s['heading'] === '') {
                        $this->error('sections.'.$s['key'], 'Give every section a heading.');
                    }

                    if (Rich::isEmpty($s['body'])) {
                        $this->error('sections.'.$s['key'], 'The section ":heading" is empty.', ['heading' => $s['heading'] ?: '…']);
                    }
                }

                continue;
            }

            $section = $byKey[$skeleton['key']] ?? null;

            if ($skeleton['required'] && ($section === null || Rich::isEmpty($section['body']))) {
                $this->error('sections.'.$skeleton['key'], 'The section ":heading" is empty.', ['heading' => $section['heading'] ?? $skeleton['heading']]);
            }
        }

        $tables = 0;

        foreach ($sections as $section) {
            Rich::each($section['body'], 'tableBlock', function (array $block) use ($section, &$tables) {
                $tables++;
                $caption = collect((array) ($block['content'] ?? []))->firstWhere('type', 'tableCaption');

                if (Rich::text($caption) === '') {
                    $this->error('sections.'.$section['key'], 'Table :n has no caption.', ['n' => $tables]);
                }
            });
        }

        $figures = 0;

        foreach ($sections as $section) {
            Rich::each($section['body'], 'figure', function (array $figure) use ($section, &$figures) {
                $figures++;
                $field = 'sections.'.$section['key'];
                $caption = collect((array) ($figure['content'] ?? []))->firstWhere('type', 'figureCaption');

                if (trim((string) ($figure['attrs']['image'] ?? '')) === '') {
                    $this->error($field, 'Figure :n has no image.', ['n' => $figures]);
                }

                if (Rich::text($caption) === '') {
                    $this->error($field, 'Figure :n has no caption.', ['n' => $figures]);
                }

                if (trim((string) ($figure['attrs']['alt'] ?? '')) === '') {
                    $this->warning($field, 'Figure :n: describe the image in a few words (for readers who cannot see it).', ['n' => $figures]);
                }
            });
        }

        $tables += $figures;
        $max = config("manuscript.types.{$type}.max_tables_and_figures");

        if ($max !== null && $tables > (int) $max) {
            $this->warning('sections', 'This type of paper allows at most :max tables and figures (now :count).', ['max' => $max, 'count' => $tables]);
        }
    }

    /** @param  array<string, mixed>  $c */
    private function back(array $c): void
    {
        if (Rich::paragraphs($c['references'] ?? null) === []) {
            $this->error('references', 'Add the references.');
        }

        if (trim((string) ($c['conflictOfInterest'] ?? '')) === '') {
            $this->warning('conflictOfInterest', 'State any conflict of interest (or that there is none).');
        }

        $summary = (array) ($c['summary'] ?? []);

        if (Rich::text($summary['title'] ?? null) === '') {
            $this->error('summary', 'Add the title of the summary in the other language.');
        }

        if (Rich::words($summary['abstract'] ?? null) === 0) {
            $this->error('summary', 'Write the summary in the other language.');
        }

        $this->keywords('summary', (array) ($summary['keywords'] ?? []));
    }

    /** @param  array<string, mixed>  $s */
    private function submission(array $s): void
    {
        $declarations = (array) ($s['declarations'] ?? []);

        foreach (array_keys((array) config('manuscript.declarations')) as $key) {
            if (! ($declarations[$key] ?? false)) {
                $this->error('declarations', 'Confirm every statement of the submission declaration.');

                break;
            }
        }

        $needed = (int) config('manuscript.suggested_reviewers', 3);
        $complete = array_filter(
            (array) ($s['suggestedReviewers'] ?? []),
            fn (array $r) => $r['name'] !== '' && $r['affiliation'] !== '' && filter_var($r['email'], FILTER_VALIDATE_EMAIL) !== false,
        );

        if (count($complete) < $needed) {
            $this->error('suggestedReviewers', 'Suggest :count reviewers with name, institution and e-mail address.', ['count' => $needed]);
        }
    }
}
