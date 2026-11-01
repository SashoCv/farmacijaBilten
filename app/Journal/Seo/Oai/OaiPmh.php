<?php

namespace App\Journal\Seo\Oai;

use App\Journal\Seo\ScholarlyMeta;
use App\Journal\Seo\SeoMeta;
use App\Journal\Seo\Text;
use App\Models\Article;
use App\Models\Issue;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Date;

/**
 * OAI-PMH 2.0 data provider (https://www.openarchives.org/OAI/openarchivesprotocol.html)
 * for the journal's articles, in Dublin Core (oai_dc).
 *
 * Items are articles, identified as "oai:bulletin.mfd.org.mk:article/71-2/001";
 * sets are issues ("issue:71-2", under the parent set "issue"); the datestamp
 * is the article's last update (UTC, seconds granularity); lists are paged
 * 100 at a time with a stateless resumption token.
 */
final class OaiPmh
{
    /** Repository identifier: the journal's own domain, independent of the host serving the request. */
    public const REPOSITORY = 'bulletin.mfd.org.mk';

    public const PAGE_SIZE = 100;

    public const GRANULARITY = 'YYYY-MM-DDThh:mm:ssZ';

    /** @var array<string, array{required: list<string>, optional: list<string>, exclusive: string|null}> */
    private const VERBS = [
        'Identify' => ['required' => [], 'optional' => [], 'exclusive' => null],
        'ListMetadataFormats' => ['required' => [], 'optional' => ['identifier'], 'exclusive' => null],
        'ListSets' => ['required' => [], 'optional' => [], 'exclusive' => 'resumptionToken'],
        'GetRecord' => ['required' => ['identifier', 'metadataPrefix'], 'optional' => [], 'exclusive' => null],
        'ListIdentifiers' => ['required' => ['metadataPrefix'], 'optional' => ['from', 'until', 'set'], 'exclusive' => 'resumptionToken'],
        'ListRecords' => ['required' => ['metadataPrefix'], 'optional' => ['from', 'until', 'set'], 'exclusive' => 'resumptionToken'],
    ];

    /** @var array<string, array{schema: string, namespace: string}> */
    public const FORMATS = [
        'oai_dc' => [
            'schema' => 'http://www.openarchives.org/OAI/2.0/oai_dc.xsd',
            'namespace' => 'http://www.openarchives.org/OAI/2.0/oai_dc/',
        ],
    ];

    /**
     * Answers one request. The result is the view data for
     * resources/views/oai/response.blade.php.
     *
     * @param  array<string, string>  $args  request arguments, including "verb"
     * @param  bool  $repeated  whether any argument was given more than once
     * @return array<string, mixed>
     */
    public function handle(array $args, bool $repeated = false): array
    {
        $response = [
            'responseDate' => Date::now()->utc()->format('Y-m-d\TH:i:s\Z'),
            'baseUrl' => self::baseUrl(),
            'requestArgs' => [],
            'verb' => null,
            'oaiErrors' => [],
        ];

        $verb = $args['verb'] ?? null;

        if (! is_string($verb) || ! isset(self::VERBS[$verb])) {
            return [...$response, 'oaiErrors' => [['badVerb', $verb === null ? 'The verb argument is missing.' : 'Illegal OAI verb.']]];
        }

        try {
            $this->validate($verb, $args, $repeated);
        } catch (OaiError $e) {
            // On badArgument the request element carries no attributes.
            return [...$response, 'oaiErrors' => [[$e->oaiCode, $e->getMessage()]]];
        }

        $response['requestArgs'] = $args;
        $response['verb'] = $verb;

        try {
            return [...$response, ...match ($verb) {
                'Identify' => $this->identify(),
                'ListMetadataFormats' => $this->listMetadataFormats($args['identifier'] ?? null),
                'ListSets' => $this->listSets($args['resumptionToken'] ?? null),
                'GetRecord' => $this->getRecord($args['identifier'], $args['metadataPrefix']),
                'ListIdentifiers', 'ListRecords' => $this->list($verb, $args),
            }];
        } catch (OaiError $e) {
            return [...$response, 'verb' => null, 'oaiErrors' => [[$e->oaiCode, $e->getMessage()]]];
        }
    }

    public static function baseUrl(): string
    {
        return SeoMeta::absolute('/oai');
    }

    public static function identifier(Article $article): string
    {
        return 'oai:'.self::REPOSITORY.':article/'.$article->issue->slug.'/'.$article->number;
    }

    /**
     * @param  array<string, string>  $args
     */
    private function validate(string $verb, array $args, bool $repeated): void
    {
        $spec = self::VERBS[$verb];
        $given = array_keys(array_diff_key($args, ['verb' => true]));

        if ($repeated) {
            throw new OaiError('badArgument', 'An argument was given more than once.');
        }

        $allowed = [...$spec['required'], ...$spec['optional'], ...array_filter([$spec['exclusive']])];

        if ($illegal = array_diff($given, $allowed)) {
            throw new OaiError('badArgument', 'Illegal argument: '.implode(', ', $illegal).'.');
        }

        if ($spec['exclusive'] && isset($args[$spec['exclusive']])) {
            if (count($given) > 1) {
                throw new OaiError('badArgument', 'The resumptionToken argument must be the only argument besides the verb.');
            }

            return;
        }

        if ($missing = array_diff($spec['required'], $given)) {
            throw new OaiError('badArgument', 'Missing required argument: '.implode(', ', $missing).'.');
        }

        foreach (['from', 'until'] as $key) {
            if (isset($args[$key]) && ! self::parseDate($args[$key], $key === 'until')) {
                throw new OaiError('badArgument', "The {$key} argument is not a valid UTCdatetime.");
            }
        }

        if (isset($args['from'], $args['until'])) {
            if (strlen($args['from']) !== strlen($args['until'])) {
                throw new OaiError('badArgument', 'The from and until arguments have different granularities.');
            }

            if (self::parseDate($args['from'], false) > self::parseDate($args['until'], true)) {
                throw new OaiError('badArgument', 'The from argument is later than the until argument.');
            }
        }
    }

    /** @return array<string, mixed> */
    private function identify(): array
    {
        $earliest = Article::query()->min('updated_at');

        return [
            'identify' => [
                'repositoryName' => config('journal.name_en'),
                'adminEmail' => config('journal.editorial_email'),
                'earliestDatestamp' => self::datestamp($earliest ? Date::parse($earliest) : Date::now()),
                'sampleIdentifier' => 'oai:'.self::REPOSITORY.':article/71-2/001',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function listMetadataFormats(?string $identifier): array
    {
        if ($identifier !== null) {
            $this->findArticle($identifier);
        }

        return ['formats' => self::FORMATS];
    }

    /** @return array<string, mixed> */
    private function listSets(?string $token): array
    {
        if ($token !== null) {
            // Every set fits in one response, so no token is ever issued.
            throw new OaiError('badResumptionToken', 'The resumption token is invalid or has expired.');
        }

        $sets = [['spec' => 'issue', 'name' => 'Issues of the '.config('journal.name_en')]];

        foreach (Issue::query()->latestFirst()->get() as $issue) {
            $sets[] = [
                'spec' => 'issue:'.$issue->slug,
                'name' => $issue->label().($issue->year ? " ({$issue->year})" : ''),
            ];
        }

        return ['sets' => $sets];
    }

    /** @return array<string, mixed> */
    private function getRecord(string $identifier, string $prefix): array
    {
        $article = $this->findArticle($identifier);
        self::assertFormat($prefix);

        return ['records' => [$this->record($article)]];
    }

    /**
     * ListIdentifiers and ListRecords.
     *
     * @param  array<string, string>  $args
     * @return array<string, mixed>
     */
    private function list(string $verb, array $args): array
    {
        if (isset($args['resumptionToken'])) {
            $state = Token::decode($args['resumptionToken']);
        } else {
            self::assertFormat($args['metadataPrefix']);
            $state = [
                'prefix' => $args['metadataPrefix'],
                'set' => $args['set'] ?? null,
                'from' => $args['from'] ?? null,
                'until' => $args['until'] ?? null,
                'offset' => 0,
            ];
        }

        $query = $this->query($state);
        $total = (clone $query)->count();

        if ($total === 0 || $state['offset'] >= $total) {
            if ($state['offset'] > 0) {
                throw new OaiError('badResumptionToken', 'The resumption token is invalid or has expired.');
            }

            throw new OaiError('noRecordsMatch', 'No records match the request.');
        }

        $articles = $query->with('issue')->skip($state['offset'])->take(self::PAGE_SIZE)->get();
        $next = $state['offset'] + $articles->count();

        return [
            'records' => $articles->map(fn (Article $a) => $this->record($a, headerOnly: $verb === 'ListIdentifiers'))->all(),
            // Only lists split over several responses carry a token (empty on the last one).
            'resumption' => $total > self::PAGE_SIZE ? [
                'token' => $next < $total ? Token::encode([...$state, 'offset' => $next]) : '',
                'completeListSize' => $total,
                'cursor' => $state['offset'],
            ] : null,
        ];
    }

    /**
     * @param  array{prefix: string, set: string|null, from: string|null, until: string|null, offset: int}  $state
     * @return Builder<Article>
     */
    private function query(array $state): Builder
    {
        $query = Article::query()->orderBy('articles.id');

        if ($state['set'] !== null && $state['set'] !== 'issue') {
            if (! preg_match('/^issue:(.+)$/', $state['set'], $m)) {
                throw new OaiError('noRecordsMatch', 'The set does not exist.');
            }

            $issueId = Issue::where('slug', $m[1])->value('id');

            if ($issueId === null) {
                throw new OaiError('noRecordsMatch', 'The set does not exist.');
            }

            $query->where('issue_id', $issueId);
        }

        if ($state['from'] !== null) {
            $query->where('updated_at', '>=', self::parseDate($state['from'], false)->format('Y-m-d H:i:s'));
        }

        if ($state['until'] !== null) {
            $query->where('updated_at', '<=', self::parseDate($state['until'], true)->format('Y-m-d H:i:s'));
        }

        return $query;
    }

    /** @return array<string, mixed> */
    private function record(Article $article, bool $headerOnly = false): array
    {
        $header = [
            'identifier' => self::identifier($article),
            'datestamp' => self::datestamp($article->updated_at ?? Date::now()),
            'setSpec' => 'issue:'.$article->issue->slug,
        ];

        return $headerOnly ? ['header' => $header] : ['header' => $header, 'dc' => self::dublinCore($article)];
    }

    /**
     * Simple Dublin Core for one article.
     *
     * @return list<array{0: string, 1: string, 2?: string}> [element, value, xml:lang?]
     */
    public static function dublinCore(Article $article): array
    {
        $lang = ScholarlyMeta::language($article);
        $doi = ScholarlyMeta::doiUrl($article);
        $pdf = ScholarlyMeta::pdfUrl($article);

        $dc = [['title', Text::plain($article->title), $lang]];

        foreach ($article->authors ?? [] as $author) {
            $dc[] = ['creator', $author];
        }

        $keywordsLang = $article->keywords_lang ?: ($article->keywords ? Article::detectLang(implode(' ', $article->keywords)) : $lang);

        foreach ($article->keywords ?? [] as $keyword) {
            $dc[] = ['subject', $keyword, $keywordsLang];
        }

        if (filled($article->abstract)) {
            $dc[] = ['description', Text::plain($article->abstract), $article->abstract_lang ?: Article::detectLang($article->abstract)];
        }

        $dc[] = ['publisher', config('journal.publisher.name_en'), 'en'];
        $dc[] = ['date', (string) $article->publicationDate()];
        $dc[] = ['type', 'info:eu-repo/semantics/article'];
        $dc[] = ['type', 'Text'];

        if ($article->type) {
            $dc[] = ['type', $article->type, 'en'];
        }

        if ($pdf) {
            $dc[] = ['format', 'application/pdf'];
        }

        $dc[] = ['identifier', ScholarlyMeta::url($article)];

        if ($doi) {
            $dc[] = ['identifier', $doi];
        }

        if ($pdf) {
            $dc[] = ['relation', $pdf];
        }

        $dc[] = ['source', ScholarlyMeta::source($article)];
        $dc[] = ['source', config('journal.issn_print')];
        $dc[] = ['source', config('journal.issn_online')];
        $dc[] = ['language', $lang];
        $dc[] = ['rights', 'info:eu-repo/semantics/openAccess'];
        $dc[] = ['rights', ScholarlyMeta::licenceUrl($article)];

        return array_values(array_filter(
            array_map(fn (array $e) => [$e[0], Text::xml($e[1]), ...array_slice($e, 2)], $dc),
            fn (array $e) => $e[1] !== '',
        ));
    }

    private function findArticle(string $identifier): Article
    {
        $prefix = 'oai:'.self::REPOSITORY.':article/';

        if (str_starts_with($identifier, $prefix)
            && preg_match('#^([0-9a-z-]+)/(\d{3,4})$#', substr($identifier, strlen($prefix)), $m)) {
            $article = Article::query()
                ->whereHas('issue', fn (Builder $q) => $q->where('slug', $m[1]))
                ->where('number', $m[2])
                ->with('issue')
                ->first();

            if ($article) {
                return $article;
            }
        }

        throw new OaiError('idDoesNotExist', 'No item has the identifier '.$identifier.'.');
    }

    private static function assertFormat(string $prefix): void
    {
        if (! isset(self::FORMATS[$prefix])) {
            throw new OaiError('cannotDisseminateFormat', 'The metadata format '.$prefix.' is not supported.');
        }
    }

    /**
     * "2025-04-30" (the whole day, for until) or "2025-04-30T10:00:00Z"; null when malformed.
     */
    public static function parseDate(string $value, bool $endOfDay): ?CarbonInterface
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $date = Date::createFromFormat('!Y-m-d', $value, 'UTC');

            if (! $date || $date->format('Y-m-d') !== $value) {
                return null;
            }

            return $endOfDay ? $date->endOfDay() : $date;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $value)) {
            $date = Date::createFromFormat('Y-m-d\TH:i:s\Z', $value, 'UTC');

            return $date && $date->format('Y-m-d\TH:i:s\Z') === $value ? $date : null;
        }

        return null;
    }

    private static function datestamp(CarbonInterface $date): string
    {
        return $date->copy()->utc()->format('Y-m-d\TH:i:s\Z');
    }
}
