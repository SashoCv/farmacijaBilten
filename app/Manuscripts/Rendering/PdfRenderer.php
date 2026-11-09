<?php

namespace App\Manuscripts\Rendering;

use App\Manuscripts\Rich;
use App\Models\Manuscript;
use App\Models\ManuscriptImage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * The manuscript as a PDF in the journal layout, from the same HTML as the
 * preview (ManuscriptRenderer) with the print stylesheet: running heads with
 * the authors and the short title, page numbers starting at the article's
 * first page, the citation line in the footer, the e-mail footnote, body in
 * one column. Rendered by WeasyPrint (config('manuscript.pdf')).
 *
 * Not final: tests replace it with a fake (WeasyPrint is not installed in CI).
 */
class PdfRenderer
{
    /** Pages of the last PDF made by render() (null when unknown). */
    public ?int $pages = null;

    /**
     * @param  array<string, mixed>  $content  normalised ManuscriptContent
     * @return string path of a temporary PDF file
     */
    public function render(Manuscript $m, array $content, bool $anonymous = false): string
    {
        $dir = storage_path('app/private/pdf-tmp/'.Str::ulid());
        File::ensureDirectoryExists($dir);

        $html = $this->document($m, $content, $anonymous);
        File::put("{$dir}/article.html", $html);
        $out = "{$dir}/article.pdf";

        $python = config('manuscript.pdf.python');
        $command = $python
            ? [(string) $python, resource_path('pdf/render.py'), "{$dir}/article.html", $out]
            : [(string) config('manuscript.pdf.weasyprint', 'weasyprint'), "{$dir}/article.html", $out];

        $process = new Process($command, $dir, null, null, (float) config('manuscript.pdf.timeout', 120));
        $this->pages = null;
        $process->run();

        if (! $process->isSuccessful() || ! is_file($out)) {
            File::deleteDirectory($dir);

            throw new RuntimeException('The PDF could not be made: '.Str::limit(trim($process->getErrorOutput() ?: $process->getOutput()), 500));
        }

        $this->pages = preg_match('/pages=(\d+)/', $process->getOutput(), $match) ? (int) $match[1] : null;

        // Keep only the PDF; the caller moves or streams it, then deletes it.
        $final = tempnam(sys_get_temp_dir(), 'mpb-pdf-');
        File::move($out, (string) $final);
        File::deleteDirectory($dir);

        return (string) $final;
    }

    /** @param  array<string, mixed>  $content */
    public function document(Manuscript $m, array $content, bool $anonymous = false): string
    {
        $language = $m->language === 'mk' ? 'mk' : 'en';

        // Images by file path: WeasyPrint reads them from disk (the URLs need a session).
        $images = $m->images()->get()->mapWithKeys(fn (ManuscriptImage $i) => [
            $i->public_id => 'file://'.Storage::disk('local')->path($i->path),
        ])->all();

        $article = ManuscriptRenderer::render($content, [
            'type' => $m->type,
            'language' => $language,
            'anonymous' => $anonymous,
            'images' => $images,
            'receivedAt' => $m->received_at?->settings(['locale' => $language])->translatedFormat('F Y'),
            'acceptedAt' => $m->accepted_at?->settings(['locale' => $language])->translatedFormat('F Y'),
            'citation' => $m->citationLine(),
            'doi' => $m->doi,
        ]);

        // The corresponding author's e-mail: printed at the foot of page 1, in
        // the bottom margin (a running element), so it never moves to page 2
        // when the first page is full.
        $note = '';

        if (preg_match('#<p class="ms-correspondence">(.*?)</p>#s', $article, $match)) {
            $article = str_replace($match[0], '', $article);
            $note = $match[1];
        }

        $css = $this->fonts()
            .File::get(resource_path('css/manuscript.css'))
            .File::get(resource_path('css/manuscript-article.css'))
            .File::get(resource_path('css/manuscript-print.css'))
            .'@page :first { counter-reset: page '.max(1, (int) $m->first_page).'; }';

        $authors = $anonymous ? '' : $this->authorsLine($content);
        $short = $this->runningTitle($content);
        $citation = $m->citationLine();

        $footer = fn (string $abbrev) => $citation !== null
            ? e($abbrev).', '.(string) preg_replace('/^(\d+)/', '<b>$1</b>', e($citation))
            : '';

        return '<!DOCTYPE html><html lang="'.$language.'"><head><meta charset="utf-8">'
            .'<title>'.e(Rich::text($content['title'] ?? null)).'</title>'
            .'<meta name="author" content="'.e($authors).'">'
            .'<style>'.$css.'</style></head><body>'
            .'<div class="run-head-even"><span class="pn"></span><span class="txt">'.e($authors).'</span><span class="pad"></span></div>'
            .'<div class="run-head-odd"><span class="pad"></span><span class="txt">'.e($short).'</span><span class="pn"></span></div>'
            .'<div class="run-footer-en">'.$footer('Maced. pharm. bull.').'</div>'
            .'<div class="run-footer-mk" lang="mk">'.$footer('Макед. фарм. билт.').'</div>'
            .'<div class="run-note">'.$note.'</div>'
            .'<div class="ms" lang="'.$language.'">'.$article.'</div>'
            .'</body></html>';
    }

    /**
     * "R. Ali, O. Majstorov, T. Petreska Ivanovska" (initials and family names).
     *
     * @param  array<string, mixed>  $content
     */
    private function authorsLine(array $content): string
    {
        return implode(', ', array_map(function (array $a) {
            $initials = implode(' ', array_map(
                fn (string $part) => mb_substr($part, 0, 1).'.',
                preg_split('/[\s-]+/u', trim($a['givenName'])) ?: [],
            ));

            return trim("{$initials} {$a['familyName']}");
        }, (array) ($content['authors'] ?? [])));
    }

    /**
     * The author's short title, or the title cut at a word with "…".
     *
     * @param  array<string, mixed>  $content
     */
    private function runningTitle(array $content): string
    {
        $short = trim((string) ($content['runningTitle'] ?? ''));

        if ($short !== '') {
            return $short;
        }

        $title = Rich::text($content['title'] ?? null);

        return mb_strlen($title) <= 80 ? $title : rtrim(mb_substr($title, 0, (int) mb_strrpos(mb_substr($title, 0, 80), ' ')), ' ,:;').'…';
    }

    private function fonts(): string
    {
        $css = '';

        foreach (['Regular' => [400, 'normal'], 'Italic' => [400, 'italic'], 'Bold' => [700, 'normal'], 'BoldItalic' => [700, 'italic']] as $file => [$weight, $style]) {
            $css .= "@font-face { font-family: 'MPB Serif'; src: url('file://".resource_path("fonts/pdf/LiberationSerif-{$file}.ttf")."'); font-weight: {$weight}; font-style: {$style}; }";
        }

        return $css;
    }
}
