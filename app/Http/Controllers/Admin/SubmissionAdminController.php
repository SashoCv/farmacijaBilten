<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Editors' list of manuscripts sent through the website: the safety net for
 * e-mail that bounces or never leaves the queue.
 *
 * Access: the editorial office (role:admin, routes/backoffice.php).
 */
class SubmissionAdminController extends Controller
{
    /** File links on the list stay valid this long (minutes). */
    private const LINK_MINUTES = 120;

    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $expires = now()->addMinutes(self::LINK_MINUTES);

        $page = $this->query($q)
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Submission $s) => $s->presentForAdmin($expires));

        return Inertia::render('admin/submissions/index', [
            'submissions' => $page->items(),
            'pagination' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
                'prevUrl' => $page->previousPageUrl(),
                'nextUrl' => $page->nextPageUrl(),
            ],
            'filters' => ['q' => $q],
            'totalAll' => Submission::count(),
            // A plain URL: the route lives in routes/submissions.php.
            'exportUrl' => url('admin/submissions/export').($q !== '' ? '?'.http_build_query(['q' => $q]) : ''),
            'linkMinutes' => self::LINK_MINUTES,
        ]);
    }

    /** CSV of every submission (or the filtered ones), UTF-8 with BOM so Excel reads Cyrillic. */
    public function export(Request $request): StreamedResponse
    {
        $q = trim((string) $request->query('q', ''));
        $filename = 'submissions-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Reference', 'Submitted', 'Status', 'Type', 'Title',
                'Corresponding author', 'E-mail', 'Affiliation',
                'Suggested reviewers', 'Message', 'Manuscript file', 'Manuscript size (bytes)', 'Signed forms',
            ], escape: '');

            $this->query($q)->cursor()->each(function (Submission $s) use ($out) {
                fputcsv($out, array_map(self::csvCell(...), [
                    $s->reference,
                    $s->created_at?->format('Y-m-d H:i'),
                    $s->status,
                    $s->type,
                    $s->title,
                    $s->name,
                    $s->email,
                    $s->affiliation,
                    $s->suggested_reviewers,
                    $s->message,
                    $s->file_name,
                    $s->file_size,
                    implode('; ', array_column($s->forms ?? [], 'name')),
                ]), escape: '');
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** @return Builder<Submission> */
    private function query(string $q): Builder
    {
        return Submission::query()
            ->when($q !== '', function (Builder $query) use ($q) {
                $like = '%'.$q.'%';

                $query->where(fn (Builder $w) => $w
                    ->where('reference', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('name', 'like', $like)
                    ->orWhere('email', 'like', $like));
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /** Neutralises spreadsheet formulas in author-supplied text (CSV injection). */
    private static function csvCell(mixed $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
