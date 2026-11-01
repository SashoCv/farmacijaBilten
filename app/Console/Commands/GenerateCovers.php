<?php

namespace App\Console\Commands;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Renders the printed issue covers and article first-page thumbnails from the
 * PDFs (poppler's pdftoppm, WebP via cwebp when installed, else JPEG), and
 * records page counts and file sizes:
 *
 *  - issues.cover_image  "media/covers/{slug}.webp" (900px wide), from a cover
 *    the editors supplied (storage/app/journal/covers-source/{slug}.pdf|jpg|png),
 *    the issue's cover PDF (front half of a cover spread) or page 1 of the full
 *    issue when that is a title page; the current issue without any of these
 *    falls back to the printed cover from the old site (media/images/naslovna.jpg);
 *  - issues.pdf_pages, issues.pdf_bytes for the full-issue PDF;
 *  - articles.pdf_thumb  "media/thumbs/{slug}/{number}.webp" (600px wide),
 *    articles.pdf_pages, articles.pdf_bytes.
 *
 * Only missing images are rendered unless --force is given.
 */
class GenerateCovers extends Command
{
    protected $signature = 'journal:generate-covers
        {--force : Render images that already exist again}
        {--issue= : Only this issue slug (and its articles)}
        {--no-articles : Skip article thumbnails}
        {--parallel=4 : Renders at a time}';

    protected $description = 'Render issue covers and article thumbnails from the PDFs';

    private const COVER_WIDTH = 900;

    private const THUMB_WIDTH = 600;

    /** Render width of a whole cover spread before the front cover is cut out. */
    private const SPREAD_WIDTH = 2400;

    /** Covers the editors supply for issues whose PDFs have none (not public). */
    public const SUPPLIED_DIR = 'covers-source';

    /** The printed front cover on the old site's home page. */
    public const FALLBACK_COVER = 'media/images/naslovna.jpg';

    private Filesystem $disk;

    private ?string $cwebp;

    private string $tmp;

    public function handle(): int
    {
        $finder = new ExecutableFinder;

        foreach (['pdftoppm', 'pdfinfo', 'pdftotext'] as $tool) {
            if ($finder->find($tool) === null) {
                $this->error("{$tool} (poppler) is not installed.");

                return self::FAILURE;
            }
        }

        $this->disk = Storage::disk('journal');
        $this->cwebp = $finder->find('cwebp', null, ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']);
        $this->tmp = storage_path('framework/cache/covers');
        @mkdir($this->tmp, 0775, true);

        if ($this->cwebp === null) {
            $this->warn('cwebp not found: writing JPEG instead of WebP.');
        }

        $issues = Issue::query()->when($this->option('issue'), fn ($q, $slug) => $q->where('slug', $slug))->get();

        $this->issueCovers(array_values($issues->all()));

        if (! $this->option('no-articles')) {
            $this->articleThumbs($issues);
        }

        Journal::flush();

        return self::SUCCESS;
    }

    /**
     * @param  list<Issue>  $issues
     */
    private function issueCovers(array $issues): void
    {
        $jobs = [];
        $current = Journal::currentIssueSlug();

        foreach ($issues as $issue) {
            if ($issue->full_pdf && $this->disk->exists($issue->full_pdf)) {
                $issue->pdf_bytes = $this->disk->size($issue->full_pdf);
                $issue->pdf_pages = $this->pageCount($issue->full_pdf);
            }

            // A cover supplied by the editors wins: covers-source/{slug}.pdf|jpg|png.
            $supplied = collect(['pdf', 'jpg', 'jpeg', 'png'])
                ->map(fn (string $ext) => self::SUPPLIED_DIR."/{$issue->slug}.{$ext}")
                ->first(fn (string $path) => $this->disk->exists($path));

            $source = $supplied ?? collect([$issue->cover_pdf, $issue->full_pdf])
                ->first(fn (?string $pdf) => $pdf && $this->disk->exists($pdf));

            // Page 1 of a full issue counts only when it is a cover or title page, not a
            // preface or contents page (CMAPSEEC 2020 starts with the preface).
            if ($source !== null && $source === $issue->full_pdf && ! $this->isTitlePage($source)) {
                $source = null;
            }

            if ($source === null) {
                // Only the current issue may use the old site's generic printed cover.
                $fallback = $issue->slug === $current && $this->disk->exists(self::FALLBACK_COVER) ? self::FALLBACK_COVER : null;
                $issue->cover_image = $fallback;
                $issue->save();

                continue;
            }

            $target = 'media/covers/'.$issue->slug.$this->extension();

            if (! $this->option('force') && $issue->cover_image === $target && $this->disk->exists($target)) {
                $issue->save();

                continue;
            }

            $jobs[] = [
                'pdf' => $source,
                'target' => $target,
                'width' => self::COVER_WIDTH,
                // A cover spread (back | front) is wider than tall: keep the front half.
                'crop' => $source !== $issue->full_pdf && str_ends_with($source, '.pdf') ? $this->frontCover($source, $issue->full_pdf) : null,
                'done' => function () use ($issue, $target) {
                    $issue->cover_image = $target;
                    $issue->save();
                },
            ];
        }

        $this->info(count($jobs).' issue covers to render.');
        $this->renderAll($jobs);

        $covered = Issue::whereNotNull('cover_image')->count();
        $this->info("{$covered} of ".Issue::count().' issues have a cover image.');
    }

    /**
     * @param  Collection<int, Issue>  $issues
     */
    private function articleThumbs(Collection $issues): void
    {
        $jobs = [];

        Article::query()
            ->with('issue:id,slug')
            ->whereIn('issue_id', $issues->modelKeys())
            ->whereNotNull('pdf')
            ->orderBy('id')
            ->each(function (Article $article) use (&$jobs) {
                if (! $this->disk->exists($article->pdf)) {
                    return;
                }

                $article->pdf_bytes = $this->disk->size($article->pdf);
                $article->pdf_pages ??= $this->pageCount($article->pdf);

                $target = "media/thumbs/{$article->issue->slug}/{$article->number}".$this->extension();

                if (! $this->option('force') && $article->pdf_thumb === $target && $this->disk->exists($target)) {
                    $article->save();

                    return;
                }

                $article->save();

                $jobs[] = [
                    'pdf' => $article->pdf,
                    'target' => $target,
                    'width' => self::THUMB_WIDTH,
                    'crop' => null,
                    // Accepted manuscripts open with a disclaimer and a cover sheet.
                    'page' => $this->firstArticlePage($article->pdf),
                    'done' => fn () => $article->forceFill(['pdf_thumb' => $target])->save(),
                ];
            });

        $this->info(count($jobs).' article thumbnails to render.');
        $this->renderAll($jobs);

        $this->info(Article::whereNotNull('pdf_thumb')->count().' of '.Article::count().' articles have a thumbnail.');
    }

    /**
     * Runs the renders a few at a time.
     *
     * @param  list<array{pdf: string, target: string, width: int, crop: array{0: int, 1: int, 2: int, 3: int}|null, page?: int, done: callable}>  $jobs
     */
    private function renderAll(array $jobs): void
    {
        if ($jobs === []) {
            return;
        }

        $bar = $this->output->createProgressBar(count($jobs));
        $running = [];
        $failed = [];
        $parallel = max(1, (int) $this->option('parallel'));

        while ($jobs !== [] || $running !== []) {
            while ($jobs !== [] && count($running) < $parallel) {
                $job = array_shift($jobs);
                $process = $this->renderProcess($job);
                $process->start();
                $running[] = [$process, $job];
            }

            foreach ($running as $i => [$process, $job]) {
                if ($process->isRunning()) {
                    continue;
                }

                unset($running[$i]);
                $bar->advance();

                if ($process->isSuccessful() && $this->disk->exists($job['target']) && $this->disk->size($job['target']) > 0) {
                    ($job['done'])();
                } else {
                    $failed[] = "{$job['pdf']}: ".trim($process->getErrorOutput() ?: $process->getOutput());
                }
            }

            usleep(20_000);
        }

        $bar->finish();
        $this->newLine();

        foreach ($failed as $line) {
            $this->warn($line);
        }
    }

    /**
     * @param  array{pdf: string, target: string, width: int, crop: array{0: int, 1: int, 2: int, 3: int}|null, page?: int}  $job
     */
    private function renderProcess(array $job): Process
    {
        $this->disk->makeDirectory(dirname($job['target']));

        $png = $this->tmp.'/'.md5($job['target']);
        $target = $this->disk->path($job['target']);
        // A spread is rendered at its own scale, then the front cover is cut out.
        $width = $job['crop'] !== null ? self::SPREAD_WIDTH : $job['width'];

        $page = (string) ($job['page'] ?? 1);
        $render = ['pdftoppm', '-f', $page, '-l', $page, '-singlefile', '-scale-to-x', (string) $width, '-scale-to-y', '-1', '-aa', 'yes', '-aaVector', 'yes'];

        if (! str_ends_with(strtolower($job['pdf']), '.pdf')) {
            // A supplied image: scale it to width.
            $commands = $this->cwebp !== null
                ? [[$this->cwebp, '-quiet', '-q', '80', '-metadata', 'none', '-resize', (string) $job['width'], '0', $this->disk->path($job['pdf']), '-o', $target]]
                : [['sips', '--resampleWidth', (string) $job['width'], '-s', 'format', 'jpeg', $this->disk->path($job['pdf']), '--out', $target]];
        } elseif ($this->cwebp === null) {
            $commands = [[...$render, '-jpeg', '-jpegopt', 'quality=82,progressive=y',
                ...($job['crop'] !== null ? ['-x', (string) $job['crop'][0], '-y', (string) $job['crop'][1], '-W', (string) $job['crop'][2], '-H', (string) $job['crop'][3]] : []),
                $this->disk->path($job['pdf']), substr($target, 0, -4)]];
        } else {
            $crop = $job['crop'] !== null
                ? ['-crop', ...array_map(strval(...), $job['crop']), '-resize', (string) $job['width'], '0']
                : [];
            $commands = [
                [...$render, '-png', $this->disk->path($job['pdf']), $png],
                [$this->cwebp, '-quiet', '-q', '80', '-m', '6', '-metadata', 'none', ...$crop, $png.'.png', '-o', $target],
                ['rm', '-f', $png.'.png'],
            ];
        }

        $script = implode(' && ', array_map(
            fn (array $command) => implode(' ', array_map(escapeshellarg(...), $command)),
            $commands,
        ));

        return Process::fromShellCommandline($script)->setTimeout(120);
    }

    private function extension(): string
    {
        return $this->cwebp !== null ? '.webp' : '.jpg';
    }

    private function pageCount(string $pdf): ?int
    {
        $process = new Process(['pdfinfo', $this->disk->path($pdf)]);
        $process->setTimeout(30)->run();

        return preg_match('/^Pages:\s+(\d+)/m', $process->getOutput(), $m) ? (int) $m[1] : null;
    }

    /** First page of the article itself: after the "unedited manuscript" pages of early-online PDFs. */
    private function firstArticlePage(string $pdf): int
    {
        $process = new Process(['pdftotext', '-f', '1', '-l', '4', '-enc', 'UTF-8', $this->disk->path($pdf), '-']);
        $process->setTimeout(30)->run();
        $pages = explode("\f", $process->getOutput());

        if (stripos($pages[0], 'unedited manuscript') === false) {
            return 1;
        }

        foreach ($pages as $i => $text) {
            if (! preg_match('/unedited manuscript|Accepted Manuscript/i', $text) && trim($text) !== '') {
                return $i + 1;
            }
        }

        return 1;
    }

    /** Whether page 1 carries little text, as a cover or title page does. */
    private function isTitlePage(string $pdf): bool
    {
        $process = new Process(['pdftotext', '-f', '1', '-l', '1', '-enc', 'UTF-8', $this->disk->path($pdf), '-']);
        $process->setTimeout(30)->run();

        return mb_strlen((string) preg_replace('/\s+/u', '', $process->getOutput())) <= 800;
    }

    /**
     * Where the front cover sits on a printed cover spread (back | front, with
     * bleed and crop marks around), in pixels at SPREAD_WIDTH: the right-hand
     * page of the journal's trim size (page 1 of the full issue, else A4-like
     * 581 x 813 pt), centred vertically. Null when page 1 is not a spread.
     *
     * @return array{0: int, 1: int, 2: int, 3: int}|null
     */
    private function frontCover(string $pdf, ?string $fullPdf): ?array
    {
        $spread = $this->pageSize($pdf);

        if ($spread === null || $spread[0] <= $spread[1] * 1.2) {
            return null;
        }

        $trim = ($fullPdf && $this->disk->exists($fullPdf) ? $this->pageSize($fullPdf) : null) ?? [581.1, 813.5];
        $scale = self::SPREAD_WIDTH / $spread[0];

        return [
            (int) round($spread[0] / 2 * $scale),
            (int) round(max(0, ($spread[1] - $trim[1]) / 2) * $scale),
            (int) round(min($trim[0], $spread[0] / 2) * $scale),
            (int) round(min($trim[1], $spread[1]) * $scale),
        ];
    }

    /** @return array{0: float, 1: float}|null Width and height of page 1, in points. */
    private function pageSize(string $pdf): ?array
    {
        $process = new Process(['pdfinfo', '-f', '1', '-l', '1', $this->disk->path($pdf)]);
        $process->setTimeout(30)->run();

        return preg_match('/Page\s+1 size:\s+([\d.]+) x ([\d.]+)/', $process->getOutput(), $m) === 1
            ? [(float) $m[1], (float) $m[2]]
            : null;
    }
}
