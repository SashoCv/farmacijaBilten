<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ManuscriptStatus;
use App\Http\Controllers\Controller;
use App\Manuscripts\Content;
use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\ReviewPresenter;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Manuscript;
use App\Models\ManuscriptNote;
use App\Notifications\Manuscripts\MessageFromEditors;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The editorial office's view of every manuscript sent through the system
 * (drafts stay private to their authors).
 */
class ManuscriptAdminController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = ManuscriptStatus::tryFrom((string) $request->query('status', ''));

        $manuscripts = Manuscript::query()
            ->with('submitter')
            ->where('status', '!=', ManuscriptStatus::Draft->value)
            ->when($status, fn ($query) => $query->where('status', $status->value))
            ->orderByDesc('submitted_at')
            ->get();

        // Small numbers: search in PHP so Cyrillic matches regardless of case.
        if ($q !== '') {
            $needle = mb_strtolower($q);
            $manuscripts = $manuscripts->filter(fn (Manuscript $m) => str_contains(
                mb_strtolower(implode(' ', [$m->reference, $m->title, $m->submitter->name, $m->submitter->email])),
                $needle,
            ));
        }

        $counts = Manuscript::query()
            ->where('status', '!=', ManuscriptStatus::Draft->value)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $page = max(1, (int) $request->query('page', 1));
        $total = $manuscripts->count();
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min($page, $lastPage);

        return Inertia::render('admin/manuscripts/index', [
            'manuscripts' => $manuscripts->forPage($page, self::PER_PAGE)->values()
                ->map(fn (Manuscript $m) => ManuscriptPresenter::summary($m, route('admin.manuscripts.show', $m), withSubmitter: true))
                ->all(),
            'counts' => $counts,
            'statuses' => array_values(array_filter(
                array_map(fn (ManuscriptStatus $s) => $s->value, ManuscriptStatus::cases()),
                fn (string $s) => $s !== ManuscriptStatus::Draft->value,
            )),
            'filters' => ['q' => $q, 'status' => $status?->value],
            'pagination' => ['currentPage' => $page, 'lastPage' => $lastPage, 'total' => $total],
        ]);
    }

    public function show(Request $request, Manuscript $manuscript): Response
    {
        Gate::authorize('view', $manuscript);

        $manuscript->loadMissing('submitter');
        $content = ManuscriptPresenter::content($manuscript);
        $submission = Content::normaliseSubmission((array) $manuscript->submission_data);

        return Inertia::render('admin/manuscripts/show', [
            'manuscript' => [
                ...ManuscriptPresenter::summary($manuscript, route('admin.manuscripts.show', $manuscript), withSubmitter: true),
                'authorsLine' => ManuscriptPresenter::authorsLine($content),
                'versions' => $manuscript->versions()->count(),
            ],
            'html' => ManuscriptPresenter::html($manuscript, $content),
            'events' => ManuscriptPresenter::events($manuscript),
            'submission' => $submission,
            'declarations' => (array) config('manuscript.declarations'),
            'reviews' => ReviewPresenter::forAdmin($manuscript),
            'publishing' => [
                'canAssign' => in_array($manuscript->status, [ManuscriptStatus::Accepted, ManuscriptStatus::InProduction], true),
                'issue' => $manuscript->journalIssue ? ['slug' => $manuscript->journalIssue->slug, 'label' => $manuscript->journalIssue->label(), 'url' => route('admin.issues.show', $manuscript->journalIssue)] : null,
                'openIssues' => Issue::where('is_published', false)->orderByDesc('volume')->orderByDesc('number')->get()
                    ->map(fn (Issue $i) => ['slug' => $i->slug, 'label' => $i->label()])->values()->all(),
                'assignUrl' => route('admin.manuscripts.issue', $manuscript),
                'publishUrl' => $manuscript->status === ManuscriptStatus::Accepted && $manuscript->issue_id ? route('admin.manuscripts.publish', $manuscript) : null,
                'pdfUrl' => route('manuscripts.pdf', $manuscript),
                'articleUrl' => $manuscript->article ? route('articles.show', [$manuscript->article->issue, $manuscript->article->number]) : null,
            ],
            'notes' => [
                'items' => $manuscript->notes()->with('user')->latest('id')->get()->map(fn (ManuscriptNote $n) => [
                    'id' => $n->id,
                    'author' => $n->user?->name,
                    'body' => $n->body,
                    'visibleToAuthor' => $n->visible_to_author,
                    'at' => $n->created_at?->toIso8601String(),
                ])->values()->all(),
                'url' => route('admin.manuscripts.notes.store', $manuscript),
            ],
            'publication' => [
                'doi' => $manuscript->doi,
                'volume' => $manuscript->volume,
                'issue' => $manuscript->issue,
                'firstPage' => $manuscript->first_page,
                'lastPage' => $manuscript->last_page,
                'year' => $manuscript->publication_year,
                'doiPrefix' => (string) config('journal.doi_prefix'),
                'doiPattern' => (string) config('journal.doi_pattern'),
                'updateUrl' => route('admin.manuscripts.publication', $manuscript),
            ],
        ]);
    }

    /** An internal note (the editorial office only). */
    public function storeNote(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
            'visible_to_author' => ['nullable', 'boolean'],
        ]);
        $toAuthor = (bool) ($data['visible_to_author'] ?? false);

        $note = DB::transaction(function () use ($manuscript, $request, $data, $toAuthor) {
            $note = $manuscript->notes()->create([
                'user_id' => $request->user()?->id,
                'body' => trim($data['body']),
                'visible_to_author' => $toAuthor,
            ]);

            if ($toAuthor) {
                $manuscript->events()->create([
                    'actor_id' => $request->user()?->id,
                    'type' => 'note_to_author',
                    'payload' => ['note' => $note->id],
                ]);
            }

            return $note;
        });

        if ($toAuthor) {
            $manuscript->submitter->notify(new MessageFromEditors($manuscript, $note));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $toAuthor ? __('Message sent to the authors.') : __('Note added.')]);

        return back();
    }

    /** DOI, volume, issue, pages and year, assigned by the editorial office. */
    public function updatePublication(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        $data = $request->validate([
            'doi' => [
                'nullable', 'string', 'max:120', 'regex:/^10\.\d{4,9}\/[^\s]+$/',
                Rule::unique('manuscripts', 'doi')->ignore($manuscript->id),
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (is_string($value) && Article::where('doi', $value)->exists()) {
                        $fail(__('This DOI already belongs to a published article.'));
                    }
                },
            ],
            'volume' => ['nullable', 'integer', 'between:1,999'],
            'issue' => ['nullable', 'string', 'max:10', 'regex:/^[0-9A-Za-z-]+$/'],
            'first_page' => ['nullable', 'integer', 'between:1,9999'],
            'last_page' => ['nullable', 'integer', 'between:1,9999', 'gte:first_page'],
            'publication_year' => ['nullable', 'integer', 'between:1990,2100'],
        ], [], [
            'doi' => 'DOI',
            'first_page' => __('first page'),
            'last_page' => __('last page'),
            'publication_year' => __('year'),
        ]);

        $manuscript->forceFill($data);
        $changed = array_keys($manuscript->getDirty());

        if ($changed !== []) {
            DB::transaction(function () use ($manuscript, $request, $changed) {
                $manuscript->save();
                $manuscript->events()->create([
                    'actor_id' => $request->user()?->id,
                    'type' => 'publication_details_updated',
                    'payload' => ['fields' => $changed],
                ]);
            });
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Publication details saved.')]);

        return back();
    }
}
