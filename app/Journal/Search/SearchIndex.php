<?php

namespace App\Journal\Search;

use App\Models\Article;
use Illuminate\Support\Facades\DB;

/**
 * Maintains `articles.search_text`: the folded title, authors, keywords,
 * abstract and DOI of each article, in that order, separated by section
 * markers. Because the title comes first, the position of a term's first
 * occurrence tells the ranking which field it was found in.
 *
 *   " <title> |a| <authors> |k| <keywords> |b| <abstract> |d| <doi> "
 *
 * Folded text holds only letters, digits and single spaces, so neither the
 * markers nor the padding spaces can be produced by a query term.
 */
final class SearchIndex
{
    public const AUTHORS = ' |a| ';

    public const KEYWORDS = ' |k| ';

    public const ABSTRACT = ' |b| ';

    public const DOI = ' |d| ';

    /** The search_text value for an article. */
    public static function document(Article $article): string
    {
        $abstract = html_entity_decode(strip_tags((string) $article->abstract), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return ' '.Folder::fold((string) $article->title)
            .self::AUTHORS.Folder::fold(implode(' ; ', $article->authors ?? []))
            .self::KEYWORDS.Folder::fold(implode(' ; ', $article->keywords ?? []))
            .self::ABSTRACT.Folder::fold($abstract)
            .self::DOI.Folder::fold((string) $article->doi)
            .' ';
    }

    /**
     * Rebuilds the index. With `$onlyMissing`, only rows that have none yet.
     * Writes through the query builder so `updated_at` is left alone.
     *
     * @return int Number of articles indexed.
     */
    public static function rebuild(bool $onlyMissing = false): int
    {
        $count = 0;

        DB::transaction(function () use ($onlyMissing, &$count) {
            Article::query()
                ->select(['id', 'title', 'authors', 'keywords', 'abstract', 'doi'])
                ->when($onlyMissing, fn ($q) => $q->whereNull('search_text'))
                ->orderBy('id')
                ->chunkById(200, function ($articles) use (&$count) {
                    foreach ($articles as $article) {
                        Article::query()->whereKey($article->id)->toBase()
                            ->update(['search_text' => self::document($article)]);
                        $count++;
                    }
                });
        });

        return $count;
    }

    /**
     * Indexes any article that was added or edited without going through
     * `journal:index-search` (a cleared search_text means "reindex me"), so
     * search never silently misses a row. One indexed `IS NULL` probe when
     * nothing is pending.
     */
    public static function ensureFresh(): void
    {
        if (Article::query()->whereNull('search_text')->exists()) {
            self::rebuild(onlyMissing: true);
        }
    }
}
