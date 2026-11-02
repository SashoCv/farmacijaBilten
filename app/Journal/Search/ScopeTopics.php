<?php

namespace App\Journal\Search;

use App\Models\Page;
use Illuminate\Support\Facades\Cache;

/**
 * The subject areas listed on the Aims & scope page, offered as search
 * suggestions when a search finds nothing. Taken from the page text itself
 * ("…fields of interest for pharmacy (pharmaceutical and medicinal chemistry,
 * immunology…)"), never invented, and only those that lead to results.
 */
final class ScopeTopics
{
    public const PAGE = 'guidelines/aims-and-scope';

    /**
     * @return list<array{label: string, count: int}>
     */
    public static function suggestions(int $limit = 10): array
    {
        $topics = Cache::remember('journal.search.scope-topics', now()->addDay(), function () {
            $body = Page::query()->where('path', self::PAGE)->value('body');

            return collect(self::parse((string) $body))
                ->map(fn (string $label) => ['label' => $label, 'count' => ArticleSearch::countFor($label)])
                ->filter(fn (array $topic) => $topic['count'] > 0)
                ->values()
                ->all();
        });

        return array_slice($topics, 0, $limit);
    }

    /** Clears the cached list (after an import or a page edit). */
    public static function flush(): void
    {
        Cache::forget('journal.search.scope-topics');
    }

    /**
     * The longest comma-separated list in parentheses, split into topics.
     *
     * @return list<string>
     */
    public static function parse(string $html): array
    {
        $text = (string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));

        if (! preg_match_all('/\(([^()]{20,})\)/u', $text, $groups)) {
            return [];
        }

        $list = collect($groups[1])
            ->filter(fn (string $group) => substr_count($group, ',') >= 4)
            ->sortByDesc(fn (string $group) => substr_count($group, ','))
            ->first();

        if ($list === null) {
            return [];
        }

        return array_values(collect(explode(',', $list))
            ->map(fn (string $topic) => trim((string) preg_replace('/\s*\betc\.?$/u', '', trim($topic)), ' .;'))
            ->filter(fn (string $topic) => mb_strlen($topic) >= 3 && mb_strlen($topic) <= 60)
            ->unique()
            ->all());
    }
}
