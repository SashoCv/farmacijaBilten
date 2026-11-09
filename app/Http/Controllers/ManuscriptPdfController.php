<?php

namespace App\Http\Controllers;

use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\Publishing;
use App\Manuscripts\Rendering\PdfRenderer;
use App\Models\Manuscript;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * The manuscript as a PDF in the journal layout (the same PDF "Publish
 * online" makes), shown in the browser, for whoever may see the manuscript.
 * Nothing is saved: until the manuscript is published the pages are only
 * a preview (from the first page set, or the page after the issue's last
 * article).
 */
class ManuscriptPdfController extends Controller
{
    public function __invoke(Manuscript $manuscript, PdfRenderer $renderer): BinaryFileResponse
    {
        Gate::authorize('view', $manuscript);

        // Reviewers get the anonymised text under double-anonymous review.
        $anonymous = ! Gate::allows('viewAsAuthorOrEditor', $manuscript)
            && config('journal.review.anonymity') === 'double';

        if (! $manuscript->first_page && $manuscript->journalIssue) {
            $manuscript->first_page = Publishing::nextPage($manuscript->journalIssue);
        }

        try {
            $path = $renderer->render($manuscript, ManuscriptPresenter::content($manuscript), $anonymous);
        } catch (RuntimeException $e) {
            Log::error('PDF preview for '.$manuscript->reference.': '.$e->getMessage());

            abort(503, __('The PDF could not be made. Try again later.'));
        }

        $name = ($manuscript->reference ?? 'manuscript').'-'.Str::limit(Str::slug($manuscript->title ?: 'untitled'), 60, '').'.pdf';

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$name.'"',
            'Cache-Control' => 'private, no-store',
        ])->deleteFileAfterSend();
    }
}
