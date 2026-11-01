<?php

namespace App\Journal\Search;

use App\Models\Article;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Article search over the folded `articles.search_text` index, with facets
 * (issue kind, article type, year, volume), three sort orders and real
 * pagination. Every filter lives in the URL:
 *
 *   /search?q=HPLC&kind=regular&type=Review+paper&from=2015&to=2020&volume=66&sort=newest&page=2
 */
final class ArticleSearch
{
    public const PER_PAGE = 20;

    public const SORTS = ['relevance', 'newest', 'oldest'];

    /** URL value => issues.kind values. */
    public const KINDS = [
        'regular' => [Issue::KIND_ISSUE, Issue::KIND_VOLUME],
        'supplement' => [Issue::KIND_SUPPLEMENT],
        'abstracts' => [Issue::KIND_ABSTRACTS],
    ];

    /** Characters in the excerpt sent with each result. */
    private const EXCERPT = 300;

    /**
     * @param  list<string>  $terms  Folded terms (Folder::terms()).
     * @param  array{type: ?string, kind: ?string, from: ?int, to: ?int, volume: ?int}  $filters
     */
    private function __construct(
        public readonly string $query,
        public readonly array $terms,
        public readonly array $filters,
        public readonly string $sort,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $query = (string) $request->string('q')->squish()->limit(120, '');
        $terms = Folder::terms($query);

        $type = (string) $request->string('type')->squish()->limit(80, '');
        $kind = (string) $request->string('kind');
        [$from, $to] = [self::year($request->query('from')), self::year($request->query('to'))];

        if ($from !== null && $to !== null && $from > $to) {
            [$from, $to] = [$to, $from];
        }

        $volume = filter_var($request->query('volume'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 999]]);
        $sort = (string) $request->string('sort');

        if (! in_array($sort, self::SORTS, true) || ($sort === 'relevance' && $terms === [])) {
            // Without words to rank by, "relevance" means newest first.
            $sort = $terms === [] ? 'newest' : 'relevance';
        }

        return new self($query, $terms, [
            'type' => $type !== '' ? $type : null,
            'kind' => array_key_exists($kind, self::KINDS) ? $kind : null,
            'from' => $from,
            'to' => $to,
            'volume' => $volume === false ? null : $volume,
        ], $sort);
    }

    /** True when there is something to search for: words or at least one filter. */
    public function active(): bool
    {
        return $this->terms !== [] || array_filter($this->filters, fn ($v) => $v !== null) !== [];
    }

    /**
     * One page of results.
     *
     * @return array{results: list<array<string, mixed>>, total: int, page: int, lastPage: int}
     */
    public function paginate(int $page): array
    {
        $total = $this->base()->count();
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min(max(1, $page), $lastPage);

        $query = $this->base()
            ->select('articles.*')
            ->with('issue');

        $this->order($query);

        $results = $query
            ->forPage($page, self::PER_PAGE)
            ->get()
            ->map(fn (Article $article) => $this->present($article))
            ->all();

        return ['results' => $results, 'total' => $total, 'page' => $page, 'lastPage' => $lastPage];
    }

    /**
     * Counts for each filter value. Each facet is counted with every other
     * filter applied but not its own, so choosing "Supplements" still shows
     * how many regular-issue matches there are.
     *
     * @return array{kinds: list<array{value: string, count: int}>, types: list<array{value: string, count: int}>, years: list<array{value: int, count: int}>, volumes: list<array{value: int, year: int|null, count: int}>}
     */
    public function facets(): array
    {
        $kindCase = "case when issues.kind in ('".Issue::KIND_ISSUE."', '".Issue::KIND_VOLUME."') then 'regular' else issues.kind end";

        $kinds = $this->base(except: 'kind')
            ->selectRaw("{$kindCase} as value, count(*) as aggregate")
            ->groupByRaw($kindCase)
            ->toBase()->get();

        $types = $this->base(except: 'type')
            ->whereNotNull('articles.type')->where('articles.type', '<>', '')
            ->selectRaw('articles.type as value, count(*) as aggregate')
            ->groupBy('articles.type')
            ->orderByDesc('aggregate')->orderBy('articles.type')
            ->toBase()->get();

        $years = $this->base(except: 'years')
            ->whereNotNull('issues.year')
            ->selectRaw('issues.year as value, count(*) as aggregate')
            ->groupBy('issues.year')
            ->orderByDesc('issues.year')
            ->toBase()->get();

        $volumes = $this->base(except: 'volume')
            ->selectRaw('issues.volume as value, max(issues.year) as year, count(*) as aggregate')
            ->groupBy('issues.volume')
            ->orderByDesc('issues.volume')
            ->toBase()->get();

        $order = array_flip(array_keys(self::KINDS));

        return [
            'kinds' => $kinds
                ->filter(fn ($row) => isset($order[$row->value]))
                ->sortBy(fn ($row) => $order[$row->value])
                ->map(fn ($row) => ['value' => (string) $row->value, 'count' => (int) $row->aggregate])
                ->values()->all(),
            'types' => $types->map(fn ($row) => ['value' => (string) $row->value, 'count' => (int) $row->aggregate])->all(),
            'years' => $years->map(fn ($row) => ['value' => (int) $row->value, 'count' => (int) $row->aggregate])->all(),
            'volumes' => $volumes->map(fn ($row) => [
                'value' => (int) $row->value,
                'year' => $row->year === null ? null : (int) $row->year,
                'count' => (int) $row->aggregate,
            ])->all(),
        ];
    }

    /**
     * How many articles match a query, with no filters. Used to keep only
     * the suggestions that lead somewhere.
     */
    public static function countFor(string $query): int
    {
        $terms = Folder::terms($query);

        if ($terms === []) {
            return 0;
        }

        $q = Article::query();

        foreach ($terms as $term) {
            $q->whereRaw('instr(articles.search_text, ?) > 0', [$term]);
        }

        return $q->count();
    }

    /**
     * Matching articles joined to their issue, with the filters applied
     * (all, or all but one facet).
     *
     * @param  'kind'|'type'|'years'|'volume'|null  $except
     * @return Builder<Article>
     */
    private function base(?string $except = null): Builder
    {
        $query = Article::query()->join('issues', 'issues.id', '=', 'articles.issue_id');

        foreach ($this->terms as $term) {
            // Both sides are folded to lower-case letters, digits and spaces,
            // so a plain substring test is exact and needs no LIKE escaping.
            $query->whereRaw('instr(articles.search_text, ?) > 0', [$term]);
        }

        $f = $this->filters;

        if ($except !== 'kind' && $f['kind'] !== null) {
            $query->whereIn('issues.kind', self::KINDS[$f['kind']]);
        }

        if ($except !== 'type' && $f['type'] !== null) {
            $query->where('articles.type', $f['type']);
        }

        if ($except !== 'years') {
            $query->when($f['from'] !== null, fn ($q) => $q->where('issues.year', '>=', $f['from']))
                ->when($f['to'] !== null, fn ($q) => $q->where('issues.year', '<=', $f['to']));
        }

        if ($except !== 'volume' && $f['volume'] !== null) {
            $query->where('issues.volume', $f['volume']);
        }

        return $query;
    }

    /** @param  Builder<Article>  $query */
    private function order(Builder $query): void
    {
        // Regular issues, then supplements, then the rest, within a volume.
        $kindRank = "case issues.kind when 'issue' then 0 when 'supplement' then 1 else 2 end";

        if ($this->sort === 'relevance') {
            [$sql, $bindings] = $this->scoreSql();
            $query->orderByRaw("{$sql} desc", $bindings);
        }

        $direction = $this->sort === 'oldest' ? 'asc' : 'desc';

        $query->orderBy('issues.volume', $direction)
            ->orderByRaw($kindRank)
            ->orderByRaw("coalesce(issues.number, 0) {$direction}")
            // Within an issue, always in printed order.
            ->orderBy('articles.position')
            ->orderBy('articles.id');
    }

    /**
     * Relevance: per term, where it is first found (title 10, authors 6,
     * keywords 4, abstract or DOI 1), +1 when it starts a word; +5 when the
     * whole query appears in the title as written.
     *
     * @return array{0: string, 1: list<string>}
     */
    private function scoreSql(): array
    {
        $parts = [];
        $bindings = [];
        $s = 'articles.search_text';

        foreach ($this->terms as $term) {
            $parts[] = "(case when instr({$s}, ?) < instr({$s}, ?) then 10"
                ." when instr({$s}, ?) < instr({$s}, ?) then 6"
                ." when instr({$s}, ?) < instr({$s}, ?) then 4 else 1 end)"
                ." + (case when instr({$s}, ?) > 0 then 1 else 0 end)";
            array_push($bindings,
                $term, SearchIndex::AUTHORS,
                $term, SearchIndex::KEYWORDS,
                $term, SearchIndex::ABSTRACT,
                ' '.$term,
            );
        }

        if (count($this->terms) > 1) {
            $parts[] = "(case when instr({$s}, ?) between 1 and instr({$s}, ?) then 5 else 0 end)";
            array_push($bindings, ' '.implode(' ', $this->terms), SearchIndex::AUTHORS);
        }

        return ['('.implode(' + ', $parts).')', $bindings];
    }

    /**
     * A result row: the article summary plus its place in the journal and a
     * short excerpt around the first match (not the whole abstract).
     *
     * @return array<string, mixed>
     */
    private function present(Article $article): array
    {
        $issue = $article->issue;
        $sections = $this->sections((string) $article->search_text);
        $inAbstract = $this->terms !== [] && $this->any($sections['abstract']);
        $excerpt = self::excerpt($article->abstract, $inAbstract ? $this->terms : []);
        $keywords = $article->keywords ?? [];

        return [
            ...$article->presentSummary(),
            // Kept small (20 rows per page): with search words the row marks up
            // the plain title, so the rich one is not used; Cite opens the
            // dialog, which builds every style from the structured fields.
            ...($this->terms !== [] ? ['titleHtml' => ''] : []),
            'citation' => '',
            'volume' => $issue->volume,
            'year' => $issue->year,
            'issueKind' => $issue->kind,
            'issueNumber' => $issue->number,
            'issuePublished' => $issue->is_published,
            'excerpt' => $excerpt,
            // Where the excerpt comes from: around a match, or the opening of the abstract.
            'excerptMatch' => $excerpt !== null && $inAbstract,
            'excerptLang' => $excerpt === null ? null : ($article->abstract_lang ?? Article::detectLang($excerpt)),
            'matchedKeywords' => $this->terms !== [] && $this->any($sections['keywords'])
                ? array_values(array_filter($keywords, fn (string $k) => $this->any(Folder::fold($k))))
                : [],
            'keywordsLang' => $keywords ? ($article->keywords_lang ?? Article::detectLang(implode(' ', $keywords))) : null,
        ];
    }

    /**
     * The folded sections of a search_text value.
     *
     * @return array{keywords: string, abstract: string}
     */
    private function sections(string $text): array
    {
        $k = strpos($text, SearchIndex::KEYWORDS);
        $b = strpos($text, SearchIndex::ABSTRACT);
        $d = strpos($text, SearchIndex::DOI);

        if ($k === false || $b === false || $d === false) {
            return ['keywords' => '', 'abstract' => ''];
        }

        return [
            'keywords' => substr($text, $k, $b - $k),
            'abstract' => substr($text, $b, $d - $b),
        ];
    }

    private function any(string $folded): bool
    {
        foreach ($this->terms as $term) {
            if ($term !== '' && str_contains($folded, $term)) {
                return true;
            }
        }

        return false;
    }

    /**
     * About 300 characters of `$text` around the first word that matches one
     * of the folded `$terms`, cut at word boundaries with ellipses; with no
     * terms (or no match), the opening of the text.
     *
     * @param  list<string>  $terms
     */
    public static function excerpt(?string $text, array $terms, int $length = self::EXCERPT): ?string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8')));

        if ($text === '') {
            return null;
        }

        $chars = mb_strlen($text);

        if ($chars <= $length) {
            return $text;
        }

        $at = self::firstMatch($text, $terms);
        // Put the match about a third of the way in, so it has context on both sides.
        $start = $at === null ? 0 : max(0, $at - (int) ($length * 0.35));
        $end = min($chars, $start + $length);
        $start = max(0, $end - $length);

        $slice = mb_substr($text, $start, $end - $start);

        if ($start > 0 && ($space = mb_strpos($slice, ' ')) !== false && $space < 30) {
            $slice = mb_substr($slice, $space + 1);
        }

        if ($end < $chars && ($space = mb_strrpos($slice, ' ')) !== false && $space > mb_strlen($slice) - 30) {
            $slice = mb_substr($slice, 0, $space);
        }

        $slice = rtrim($slice, ' ,;:–-');

        return ($start > 0 ? '…' : '').$slice.($end < $chars ? '…' : '');
    }

    /**
     * Character offset of the first word whose folded form contains (the
     * first word of) a term.
     *
     * @param  list<string>  $terms
     */
    private static function firstMatch(string $text, array $terms): ?int
    {
        $needles = array_values(array_unique(array_filter(array_map(fn (string $t) => explode(' ', $t)[0], $terms))));

        if ($needles === [] || ! preg_match_all('/[\p{L}\p{N}\p{M}]+/u', $text, $words, PREG_OFFSET_CAPTURE)) {
            return null;
        }

        $seen = [];

        foreach ($words[0] as [$word, $byte]) {
            $folded = $seen[$word] ??= Folder::fold($word);

            foreach ($needles as $needle) {
                if (str_contains($folded, $needle)) {
                    return mb_strlen(substr($text, 0, $byte));
                }
            }
        }

        return null;
    }

    private static function year(mixed $value): ?int
    {
        $year = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1900, 'max_range' => 2100]]);

        return $year === false ? null : $year;
    }
}
