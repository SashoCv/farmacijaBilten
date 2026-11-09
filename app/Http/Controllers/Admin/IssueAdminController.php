<?php

namespace App\Http\Controllers\Admin;

use App\Crossref\Crossref;
use App\Enums\ManuscriptStatus;
use App\Http\Controllers\Controller;
use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\Publishing;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Manuscript;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Preparing issues: open a new issue, place accepted manuscripts in it,
 * publish each online with its final PDF, and close the issue.
 */
class IssueAdminController extends Controller
{
    public function __construct(private Publishing $publishing) {}

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'volume' => ['required', 'integer', 'between:1,999'],
            'kind' => ['required', Rule::in([Issue::KIND_ISSUE, Issue::KIND_SUPPLEMENT])],
            'number' => ['required', 'integer', 'between:1,20'],
            'year' => ['required', 'integer', 'between:1990,2100'],
        ]);

        $issue = $this->publishing->createIssue((int) $data['volume'], $data['kind'], (int) $data['number'], (int) $data['year']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':issue is open for preparation.', ['issue' => $issue->label()])]);

        return to_route('admin.issues.show', $issue);
    }

    public function show(Issue $issue): Response
    {
        $manuscripts = Manuscript::with(['submitter', 'article'])->where('issue_id', $issue->id)->orderBy('issue_position')->get();

        return Inertia::render('admin/issues/show', [
            'issue' => [
                'slug' => $issue->slug,
                'label' => $issue->label(),
                'year' => $issue->year,
                'closed' => (bool) $issue->is_published,
                'publicUrl' => route('issues.show', $issue),
                'archiveUrl' => route('admin.archive.issue', $issue),
                'closeUrl' => route('admin.issues.close', $issue),
                'reorderUrl' => route('admin.issues.reorder', $issue),
                // DOIs of the published articles not registered at Crossref yet.
                'crossref' => [
                    'pending' => Crossref::pending($issue)->count(),
                    'xmlUrl' => route('admin.crossref.xml', $issue),
                    'depositUrl' => Crossref::connected() ? route('admin.crossref.deposit', $issue) : null,
                    'checkUrl' => route('admin.archive.dois'),
                ],
            ],
            'manuscripts' => $manuscripts->map(fn (Manuscript $m) => [
                'id' => $m->public_id,
                'reference' => $m->reference,
                'title' => $m->title,
                'authorsLine' => ManuscriptPresenter::authorsLine(ManuscriptPresenter::content($m)),
                'status' => $m->status->value,
                'position' => $m->issue_position,
                'doi' => $m->doi,
                'pages' => $m->first_page ? $m->first_page.($m->last_page ? '–'.$m->last_page : '') : null,
                'url' => route('admin.manuscripts.show', $m),
                'publishUrl' => $m->status === ManuscriptStatus::Accepted && ! $issue->is_published ? route('admin.manuscripts.publish', $m) : null,
                'pdfUrl' => route('manuscripts.pdf', $m),
                'articleUrl' => $m->article ? route('articles.show', [$issue, $m->article->number]) : null,
            ])->values()->all(),
            'articles' => $issue->articles()->orderBy('position')->get()->map(fn (Article $a) => [
                'number' => $a->number,
                'title' => $a->title,
                'authors' => $a->authors ?? [],
                'doi' => $a->doi,
                'pages' => $a->pages,
                'pdfUrl' => $a->pdf ? Storage::disk('journal')->url($a->pdf) : null,
                'publicUrl' => route('articles.show', [$issue, $a->number]),
                'fromSystem' => Manuscript::where('article_id', $a->id)->exists(),
            ])->values()->all(),
            'waiting' => Manuscript::where('status', ManuscriptStatus::Accepted->value)->whereNull('issue_id')->get()
                ->map(fn (Manuscript $m) => [
                    'id' => $m->public_id,
                    'reference' => $m->reference,
                    'title' => $m->title,
                    'url' => route('admin.manuscripts.show', $m),
                    'assignUrl' => route('admin.manuscripts.issue', $m),
                ])->values()->all(),
        ]);
    }

    public function assign(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        $data = $request->validate(['issue' => ['nullable', 'string', 'exists:issues,slug']]);
        $issue = isset($data['issue']) ? Issue::where('slug', $data['issue'])->firstOrFail() : null;

        /** @var User $admin */
        $admin = $request->user();
        $this->publishing->assign($manuscript, $issue, $admin);

        Inertia::flash('toast', ['type' => 'success', 'message' => $issue ? __('Placed in :issue.', ['issue' => $issue->label()]) : __('Removed from the issue.')]);

        return back();
    }

    public function reorder(Request $request, Issue $issue): RedirectResponse
    {
        $data = $request->validate(['order' => ['required', 'array'], 'order.*' => ['string']]);
        $this->publishing->reorder($issue, array_values($data['order']));

        return back();
    }

    public function publish(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        // Without a file the PDF is made from the manuscript in the journal layout.
        $request->validate(['pdf' => ['nullable', 'file', 'mimes:pdf', 'max:51200']]);

        /** @var User $admin */
        $admin = $request->user();
        $article = $this->publishing->publish($manuscript, $request->file('pdf'), $admin);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Published online as :number.', ['number' => $article->number])]);

        return back();
    }

    public function close(Issue $issue): RedirectResponse
    {
        $this->publishing->close($issue);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':issue is closed and published.', ['issue' => $issue->label()])]);

        return back();
    }
}
