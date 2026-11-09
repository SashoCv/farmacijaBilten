<?php

namespace App\Manuscripts;

use App\Crossref\Crossref;
use App\Crossref\DepositXml;
use App\Enums\ManuscriptStatus;
use App\Journal\Journal;
use App\Journal\Seo\Sitemap;
use App\Manuscripts\Rendering\ManuscriptRenderer;
use App\Manuscripts\Rendering\PdfRenderer;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Manuscript;
use App\Models\User;
use App\Notifications\Manuscripts\ArticlePublished;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * From an accepted manuscript to an article on the website:
 *
 * 1. the editorial office opens an issue (it is "in preparation": on the
 *    site its articles appear under Early online, like before);
 * 2. places accepted manuscripts in it, in order;
 * 3. publishes each one online: the PDF is made from the manuscript in the
 *    journal layout (PdfRenderer), or the editors upload their own; an
 *    Article is created in the issue (title, authors, abstract, key words,
 *    DOI, pages, PDF);
 * 4. closes the issue when it is complete: it becomes the current issue.
 */
final class Publishing
{
    public function __construct(private PdfRenderer $renderer) {}

    public function createIssue(int $volume, string $kind, int $number, int $year): Issue
    {
        $slug = $kind === Issue::KIND_SUPPLEMENT ? "{$volume}-s{$number}" : "{$volume}-{$number}";

        if (Issue::where('slug', $slug)->exists()) {
            throw ValidationException::withMessages(['number' => __('This issue already exists.')]);
        }

        $issue = Issue::create([
            'slug' => $slug,
            'volume' => $volume,
            'kind' => $kind,
            'number' => $number,
            'year' => $year,
            'is_published' => false,
        ]);

        self::flush();

        return $issue;
    }

    public function assign(Manuscript $m, ?Issue $issue, User $admin): void
    {
        if (! in_array($m->status, [ManuscriptStatus::Accepted, ManuscriptStatus::InProduction], true)) {
            throw ValidationException::withMessages(['issue' => __('Only accepted manuscripts can be placed in an issue.')]);
        }

        if ($issue !== null && $issue->is_published) {
            throw ValidationException::withMessages(['issue' => __('This issue is closed.')]);
        }

        DB::transaction(function () use ($m, $issue, $admin) {
            $m->forceFill([
                'issue_id' => $issue?->id,
                'issue_position' => $issue ? ((int) Manuscript::where('issue_id', $issue->id)->max('issue_position')) + 1 : null,
                'volume' => $issue->volume ?? $m->volume,
                'issue' => $issue ? self::issuePart($issue) : $m->issue,
                'publication_year' => $issue->year ?? $m->publication_year,
            ])->save();

            $m->events()->create([
                'actor_id' => $admin->id,
                'type' => $issue ? 'assigned_to_issue' : 'removed_from_issue',
                'payload' => ['issue' => $issue?->slug],
            ]);
        });
    }

    /** @param  list<string>  $publicIds  manuscripts in the new order */
    public function reorder(Issue $issue, array $publicIds): void
    {
        DB::transaction(function () use ($issue, $publicIds) {
            foreach ($publicIds as $i => $id) {
                Manuscript::where('issue_id', $issue->id)->where('public_id', $id)->update(['issue_position' => $i + 1]);
            }
        });
    }

    /**
     * Publish online: the manuscript becomes an article in its issue. Without
     * an uploaded PDF the PDF is made from the manuscript; its pages then
     * start at the manuscript's first page (or the page after the issue's
     * last article) and the last page is set from the PDF.
     */
    public function publish(Manuscript $m, ?UploadedFile $upload, User $admin): Article
    {
        $m->loadMissing('journalIssue');
        $issue = $m->journalIssue;

        if ($m->status !== ManuscriptStatus::Accepted || $issue === null) {
            throw ValidationException::withMessages(['pdf' => __('Place the accepted manuscript in an issue first.')]);
        }

        if ($issue->is_published) {
            throw ValidationException::withMessages(['pdf' => __('This issue is closed.')]);
        }

        $content = ManuscriptPresenter::content($m);
        $folder = 'volumes/Volume '.$issue->volume.'_'.($issue->kind === Issue::KIND_SUPPLEMENT ? 'S' : '').$issue->number;
        $pdf = $upload ?? $this->makePdf($m, $content, $issue);

        try {
            return $this->createArticle($m, $pdf, $admin, $issue, $content, $folder);
        } finally {
            if (! $pdf instanceof UploadedFile) {
                @unlink($pdf->getPathname());
            }
        }
    }

    /**
     * The PDF in the journal layout, with the pages set on the manuscript.
     *
     * @param  array<string, mixed>  $content
     */
    private function makePdf(Manuscript $m, array $content, Issue $issue): File
    {
        if (! $m->first_page) {
            $m->forceFill(['first_page' => self::nextPage($issue), 'last_page' => null])->save();
        }

        try {
            $path = $this->renderer->render($m, $content);

            // The footer prints "1 – 5": render again when the last page was not right.
            $last = $this->renderer->pages ? $m->first_page + $this->renderer->pages - 1 : null;

            if ($last !== null && $last !== $m->last_page) {
                $m->forceFill(['last_page' => $last])->save();
                @unlink($path);
                $path = $this->renderer->render($m, $content);
            }
        } catch (RuntimeException $e) {
            Log::error('PDF for '.$m->reference.': '.$e->getMessage());

            throw ValidationException::withMessages(['pdf' => __('The PDF could not be made. Upload the final PDF instead, or try again later.')]);
        }

        return new File($path);
    }

    /** The page after the last article already in the issue ("3–11" → 12), or 1. */
    public static function nextPage(Issue $issue): int
    {
        $last = $issue->articles()->pluck('pages')
            ->map(fn (?string $pages) => preg_match('/(\d+)\D*$/', (string) $pages, $match) ? (int) $match[1] : 0)
            ->max() ?? 0;

        $manuscripts = (int) Manuscript::where('issue_id', $issue->id)->where('status', ManuscriptStatus::Published->value)->max('last_page');

        return max($last, $manuscripts) + 1;
    }

    /** @param  array<string, mixed>  $content */
    private function createArticle(Manuscript $m, UploadedFile|File $pdf, User $admin, Issue $issue, array $content, string $folder): Article
    {
        $article = DB::transaction(function () use ($m, $pdf, $admin, $issue, $content, $folder) {
            $last = Article::where('issue_id', $issue->id)->pluck('number')->map(fn ($n) => (int) $n)->max() ?? 0;
            $number = str_pad((string) ($last + 1), 3, '0', STR_PAD_LEFT);
            $path = "{$folder}/{$issue->volume}_".($issue->kind === Issue::KIND_SUPPLEMENT ? 'S' : '')."{$issue->number}_{$number}.pdf";

            Storage::disk('journal')->putFileAs(dirname($path), $pdf, basename($path));

            $article = Article::create([
                'issue_id' => $issue->id,
                'number' => $number,
                'position' => ((int) Article::where('issue_id', $issue->id)->max('position')) + 1,
                'title' => Rich::text($content['title']),
                'title_html' => ManuscriptRenderer::inlineHtml($content['title']),
                'title_lang' => $m->language,
                'authors' => array_map(fn (array $a) => trim($a['givenName'].' '.$a['familyName']), $content['authors']),
                'affiliations' => array_map(fn (array $a) => $a['text'], $content['affiliations']),
                'authors_source' => 'editor',
                'type' => $m->typeLabel('en'),
                'pages' => $m->first_page ? $m->first_page.($m->last_page && $m->last_page !== $m->first_page ? '–'.$m->last_page : '') : null,
                'doi' => $m->doi,
                'abstract' => implode("\n\n", Rich::paragraphs($content['abstract'])) ?: null,
                'abstract_lang' => $m->language,
                'keywords' => $content['keywords'],
                'keywords_lang' => $m->language,
                'references' => implode("\n", Rich::paragraphs($content['references'])) ?: null,
                'pdf' => $path,
                'pdf_bytes' => $pdf->getSize() ?: null,
                'pdf_pages' => $pdf instanceof File && $this->renderer->pages ? $this->renderer->pages : null,
                'online_at' => now()->toDateString(),
                'received_at' => $m->received_at?->toDateString(),
                'accepted_at' => $m->accepted_at?->toDateString(),
            ]);

            $updated = Manuscript::whereKey($m->id)->where('status', ManuscriptStatus::Accepted->value)->update([
                'status' => ManuscriptStatus::Published->value,
                'article_id' => $article->id,
                'published_at' => now(),
                'updated_at' => now(),
            ]);

            if ($updated === 0) {
                throw ValidationException::withMessages(['pdf' => __('This manuscript has already been published.')]);
            }

            $m->events()->create([
                'actor_id' => $admin->id,
                'type' => 'published',
                'from_status' => ManuscriptStatus::Accepted,
                'to_status' => ManuscriptStatus::Published,
                'payload' => ['issue' => $issue->slug, 'article' => $number, 'pdf' => $pdf instanceof UploadedFile ? 'uploaded' : 'generated'],
            ]);

            return $article;
        });

        self::flush();
        $m->refresh();
        $m->submitter->notify(new ArticlePublished($m, $article));

        // Register the DOI at once, when the editorial office has turned it on.
        if (Crossref::automatic() && DepositXml::isOurs($article->doi)) {
            try {
                Crossref::deposit($issue, collect([$article]), 'publish', $admin);
            } catch (Throwable $e) {
                Log::warning('Crossref deposit for '.$article->doi.': '.$e->getMessage());
            }
        }

        return $article;
    }

    /** Close a complete issue: it becomes published (the current issue on the site). */
    public function close(Issue $issue): void
    {
        $waiting = Manuscript::where('issue_id', $issue->id)->where('status', '!=', ManuscriptStatus::Published->value)->count();

        if ($waiting > 0) {
            throw ValidationException::withMessages(['issue' => trans_choice('{1} One manuscript in this issue is not published yet.|[2,*] :count manuscripts in this issue are not published yet.', $waiting, ['count' => $waiting])]);
        }

        if (! $issue->articles()->exists()) {
            throw ValidationException::withMessages(['issue' => __('The issue has no articles yet.')]);
        }

        $issue->forceFill(['is_published' => true])->save();
        self::flush();
    }

    private static function issuePart(Issue $issue): string
    {
        return $issue->kind === Issue::KIND_SUPPLEMENT ? 'Suppl. '.$issue->number : (string) $issue->number;
    }

    private static function flush(): void
    {
        Journal::flush();
        Sitemap::flush();
    }
}
