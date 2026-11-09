<?php

namespace App\Manuscripts;

/**
 * The journal template from config/manuscript.php, in the shape the editor
 * page expects (`TemplateConfig` in resources/js/types/manuscript.ts).
 */
final class Template
{
    /** @return list<string> */
    public static function typeKeys(): array
    {
        return array_keys((array) config('manuscript.types'));
    }

    /** @return list<string> */
    public static function languagesFor(string $type): array
    {
        return array_values((array) config("manuscript.types.{$type}.languages", ['en']));
    }

    public static function otherLanguage(string $language): string
    {
        return $language === 'mk' ? 'en' : 'mk';
    }

    /**
     * Skeleton sections of a type, headings in the manuscript language.
     *
     * @return list<array{key: string, heading: string|null, alternatives: list<string>, required: bool, free: bool}>
     */
    public static function sections(string $type, string $language): array
    {
        $skeleton = (string) config("manuscript.types.{$type}.skeleton", 'research');
        $out = [];

        foreach ((array) config("manuscript.skeletons.{$skeleton}", []) as $section) {
            $heading = isset($section['heading']) ? (string) ($section['heading'][$language] ?? $section['heading']['en']) : null;
            $alternatives = [];

            foreach ((array) ($section['alternatives'] ?? []) as $alternative) {
                $alternatives[] = (string) ($alternative[$language] ?? $alternative['en']);
            }

            $out[] = [
                'key' => (string) $section['key'],
                'heading' => $heading,
                'alternatives' => $alternatives,
                'required' => (bool) ($section['required'] ?? false),
                'free' => (bool) ($section['free'] ?? false),
            ];
        }

        return $out;
    }

    /** @return array<string, string> */
    public static function labels(string $language): array
    {
        return (array) config("manuscript.labels.{$language}", config('manuscript.labels.en'));
    }

    /**
     * Everything the editor page needs (TemplateConfig).
     *
     * @return array<string, mixed>
     */
    public static function forEditor(string $language): array
    {
        $types = [];

        foreach ((array) config('manuscript.types') as $key => $type) {
            $types[] = [
                'key' => $key,
                'label' => (string) ($type['label'][app()->getLocale()] ?? $type['label']['en']),
                'languages' => array_values((array) $type['languages']),
                'abstractWords' => (int) ($type['abstract_words'] ?? 250),
                'maxTablesAndFigures' => isset($type['max_tables_and_figures']) ? (int) $type['max_tables_and_figures'] : null,
                'sections' => self::sections($key, $language),
            ];
        }

        return [
            'types' => $types,
            'keywords' => [
                'min' => (int) config('manuscript.keywords.min', 3),
                'max' => (int) config('manuscript.keywords.max', 6),
            ],
            'runningTitleMax' => (int) config('manuscript.running_title_max', 80),
            'suggestedReviewers' => (int) config('manuscript.suggested_reviewers', 3),
            'declarations' => (array) config('manuscript.declarations'),
            'labels' => self::labels($language),
            'defaultConflictOfInterest' => (string) config("manuscript.defaults.conflict_of_interest.{$language}", ''),
        ];
    }

    /**
     * Type list for the "New manuscript" form.
     *
     * @return list<array{key: string, label: string, languages: list<string>}>
     */
    public static function typeChoices(): array
    {
        $out = [];

        foreach ((array) config('manuscript.types') as $key => $type) {
            $out[] = [
                'key' => $key,
                'label' => (string) ($type['label'][app()->getLocale()] ?? $type['label']['en']),
                'languages' => array_values((array) $type['languages']),
            ];
        }

        return $out;
    }
}
