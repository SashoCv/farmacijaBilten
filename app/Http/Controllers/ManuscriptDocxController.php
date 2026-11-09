<?php

namespace App\Http\Controllers;

use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\Rendering\DocxExporter;
use App\Models\Manuscript;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * The manuscript as a Word file in the journal's layout, for whoever may see
 * it (its author, the editorial office).
 */
class ManuscriptDocxController extends Controller
{
    public function __invoke(Manuscript $manuscript, DocxExporter $exporter): BinaryFileResponse
    {
        Gate::authorize('view', $manuscript);

        // Reviewers get the anonymised text under double-anonymous review.
        $anonymous = ! Gate::allows('viewAsAuthorOrEditor', $manuscript)
            && config('journal.review.anonymity') === 'double';

        $path = $exporter->export($manuscript, ManuscriptPresenter::content($manuscript), $anonymous);
        $name = ($manuscript->reference ?? 'manuscript').'-'.Str::limit(Str::slug($manuscript->title ?: 'untitled'), 60, '').'.docx';

        return response()->download($path, $name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Cache-Control' => 'private, no-store',
        ])->deleteFileAfterSend();
    }
}
