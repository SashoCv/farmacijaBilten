<?php

namespace App\Journal\Seo;

use App\Models\Article;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Storage;

/**
 * Atom 1.0 feeds of new articles: /feed (the 50 newest: early online first,
 * then the latest issues in table-of-contents order) and /feed/early-online.
 */
final class Feed
{
    public const LIMIT = 50;

    /**
     * @return array<string, mixed> view data for resources/views/feeds/atom.blade.php
     */
    public static function latest(): array
    {
        $early = self::earlyOnlineQuery()->limit(self::LIMIT)->get();

        $published = $early->count() < self::LIMIT
            ? Article::query()
                ->select('articles.*')
                ->join('issues', 'issues.id', '=', 'articles.issue_id')
                ->where('issues.is_published', true)
                ->orderByDesc('issues.volume')
                ->orderByRaw("case issues.kind when 'issue' then 0 when 'supplement' then 1 else 2 end")
                ->orderByDesc('issues.number')
                ->orderBy('articles.position')
                ->with('issue')
                ->limit(self::LIMIT - $early->count())
                ->get()
            : new Collection;

        return self::feed(
            title: config('journal.name_en'),
            subtitle: Text::t('Latest articles'),
            self: route('feed', absolute: false),
            articles: $early->concat($published),
        );
    }

    /** @return array<string, mixed> */
    public static function earlyOnline(): array
    {
        return self::feed(
            title: config('journal.name_en').' – '.Text::t('Early online'),
            subtitle: Text::t('Articles published online ahead of their issue'),
            self: route('feed.early-online', absolute: false),
            articles: self::earlyOnlineQuery()->limit(self::LIMIT)->get(),
            alternate: route('early-online', absolute: false),
        );
    }

    /** @return Builder<Article> */
    private static function earlyOnlineQuery(): Builder
    {
        return Article::query()->earlyOnline()->with('issue')
            ->orderByDesc('online_at')->orderByDesc('issue_id')->orderBy('position');
    }

    /**
     * @param  iterable<Article>  $articles
     * @return array<string, mixed>
     */
    private static function feed(string $title, string $subtitle, string $self, iterable $articles, string $alternate = '/'): array
    {
        $entries = [];

        foreach ($articles as $article) {
            $entries[] = self::entry($article);
        }

        $updated = collect($entries)->pluck('updated')->filter()->max() ?? Date::now();

        return [
            'id' => SeoMeta::absolute($self),
            'title' => $title,
            'subtitle' => $subtitle,
            'self' => SeoMeta::absolute($self),
            'alternate' => SeoMeta::absolute($alternate),
            'updated' => $updated->utc()->toAtomString(),
            'author' => config('journal.publisher.name_en'),
            'rights' => config('journal.licence.name').' – '.config('journal.licence.url'),
            'icon' => SeoMeta::absolute('/favicon.svg'),
            'logo' => SeoMeta::absolute(SeoMeta::CARD),
            'entries' => $entries,
        ];
    }

    /** @return array<string, mixed> */
    private static function entry(Article $article): array
    {
        /** @var Issue $issue */
        $issue = $article->issue;
        $url = ScholarlyMeta::url($article);
        $published = $article->online_at;
        // The publication date is the significant change for a reader; the
        // row's updated_at mostly reflects re-imports.
        $updated = $published ?? $article->updated_at ?? Date::now();

        $summary = filled($article->abstract)
            ? Text::plain($article->abstract)
            : collect([$article->type, $issue->label(), $article->pages ? Text::t('pp. :pages', ['pages' => $article->pages]) : null])->filter()->implode(' · ');

        return [
            'id' => ScholarlyMeta::doiUrl($article) ?? $url,
            'title' => Text::xml(Text::plain($article->title)),
            'lang' => ScholarlyMeta::language($article),
            'link' => $url,
            'pdf' => ScholarlyMeta::pdfUrl($article),
            'pdfLength' => $article->pdf_bytes ?? self::fileSize($article->pdf),
            'authors' => array_map(fn (string $a) => Text::xml($a), $article->authors ?? []),
            'category' => $article->type,
            'summary' => Text::xml($summary),
            'summaryLang' => filled($article->abstract) ? ($article->abstract_lang ?: Article::detectLang($article->abstract)) : null,
            'source' => ScholarlyMeta::source($article),
            'doi' => ScholarlyMeta::registeredDoi($article),
            'published' => $published?->utc()->toAtomString(),
            'updated' => $updated,
            'updatedAtom' => $updated->utc()->toAtomString(),
        ];
    }

    private static function fileSize(?string $path): ?int
    {
        if (! $path) {
            return null;
        }

        try {
            $disk = Storage::disk('journal');

            return $disk->exists($path) ? $disk->size($path) : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
