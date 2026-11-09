<?php

namespace App\Http\Controllers\Author;

use App\Http\Controllers\Controller;
use App\Manuscripts\Content;
use App\Manuscripts\ManuscriptChecker;
use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\ManuscriptWorkflow;
use App\Manuscripts\ReviewPresenter;
use App\Manuscripts\Template;
use App\Models\Manuscript;
use App\Models\ManuscriptNote;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The author's manuscripts: write on the journal template (autosaved),
 * preview, send to the editorial office, follow the status.
 */
class ManuscriptController extends Controller
{
    public function __construct(private ManuscriptWorkflow $workflow) {}

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $manuscripts = Manuscript::where('submitter_id', $user->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Manuscript $m) => ManuscriptPresenter::summary(
                $m,
                $m->status->isEditableByAuthor() ? route('author.manuscripts.edit', $m) : route('author.manuscripts.show', $m),
            ))
            ->all();

        return Inertia::render('author/manuscripts/index', [
            'manuscripts' => $manuscripts,
            'types' => Template::typeChoices(),
            'urls' => ['store' => route('author.manuscripts.store')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'type' => ['required', Rule::in(Template::typeKeys())],
            'language' => ['nullable', 'in:en,mk'],
        ]);

        $languages = Template::languagesFor($data['type']);
        $language = in_array($data['language'] ?? null, $languages, true) ? $data['language'] : $languages[0];

        $manuscript = $this->workflow->create($user, $data['type'], $language);

        return to_route('author.manuscripts.edit', $manuscript);
    }

    public function edit(Request $request, Manuscript $manuscript): Response|RedirectResponse
    {
        if (! Gate::allows('update', $manuscript)) {
            Gate::authorize('viewAsAuthorOrEditor', $manuscript);

            return to_route('author.manuscripts.show', $manuscript);
        }

        $manuscript->loadMissing('draft');
        $content = Content::normalise((array) $manuscript->draft?->content);
        $submission = Content::normaliseSubmission((array) $manuscript->submission_data);

        return Inertia::render('author/manuscripts/edit', [
            'manuscript' => [
                'id' => $manuscript->public_id,
                'type' => $manuscript->type,
                'language' => $manuscript->language,
                'status' => $manuscript->status->value,
                'reference' => $manuscript->reference,
                'updatedAt' => $manuscript->draft?->updated_at?->toIso8601String(),
            ],
            'content' => $content,
            'submission' => $submission,
            'lock' => (int) $manuscript->draft?->lock_version,
            'issues' => ManuscriptChecker::check($content, $submission, $manuscript->type, $manuscript->language),
            'template' => Template::forEditor($manuscript->language),
            // A technical return needs no response to the reviewers.
            'lastDecisionType' => $manuscript->decisions()->latest('id')->first()?->type->value,
            'urls' => [
                'save' => route('author.manuscripts.draft', $manuscript),
                'submit' => route('author.manuscripts.submit', $manuscript),
                'preview' => route('author.manuscripts.preview', $manuscript),
                'show' => route('author.manuscripts.show', $manuscript),
                'index' => route('author.manuscripts.index'),
                'destroy' => route('author.manuscripts.destroy', $manuscript),
            ],
        ]);
    }

    /** Autosave (JSON). */
    public function saveDraft(Request $request, Manuscript $manuscript): JsonResponse
    {
        Gate::authorize('update', $manuscript);

        abort_if(strlen((string) $request->getContent()) > (int) config('manuscript.max_content_bytes'), 413);

        $data = $request->validate([
            'content' => ['required', 'array'],
            'submission' => ['present', 'array'],
            'type' => ['required', Rule::in(Template::typeKeys())],
            'language' => ['required', 'in:en,mk'],
            'lock' => ['required', 'integer'],
        ]);

        $language = in_array($data['language'], Template::languagesFor($data['type']), true)
            ? $data['language']
            : Template::languagesFor($data['type'])[0];

        /** @var User $user */
        $user = $request->user();

        return response()->json($this->workflow->save(
            $manuscript, $user, $data['content'], $data['submission'], $data['type'], $language, (int) $data['lock'],
        ));
    }

    /** The article as it will look (JSON: html + issues). */
    public function preview(Request $request, Manuscript $manuscript): JsonResponse
    {
        Gate::authorize('viewAsAuthorOrEditor', $manuscript);

        $manuscript->loadMissing('draft');
        $content = Content::normalise((array) $manuscript->draft?->content);
        $submission = Content::normaliseSubmission((array) $manuscript->submission_data);

        return response()->json([
            'html' => ManuscriptPresenter::html($manuscript, $content),
            'issues' => ManuscriptChecker::check($content, $submission, $manuscript->type, $manuscript->language),
        ]);
    }

    public function submit(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('submit', $manuscript);

        /** @var User $user */
        $user = $request->user();

        $this->workflow->submit($manuscript, $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your manuscript has been sent. Reference: :reference', ['reference' => $manuscript->reference])]);

        return to_route('author.manuscripts.show', $manuscript);
    }

    public function show(Request $request, Manuscript $manuscript): Response
    {
        Gate::authorize('viewAsAuthorOrEditor', $manuscript);

        $content = ManuscriptPresenter::content($manuscript);

        return Inertia::render('author/manuscripts/show', [
            'manuscript' => [
                ...ManuscriptPresenter::summary($manuscript, route('author.manuscripts.show', $manuscript)),
                'authorsLine' => ManuscriptPresenter::authorsLine($content),
            ],
            'html' => ManuscriptPresenter::html($manuscript, $content),
            'events' => ManuscriptPresenter::events($manuscript, forAuthor: true),
            'editUrl' => Gate::allows('update', $manuscript) ? route('author.manuscripts.edit', $manuscript) : null,
            'decisions' => ReviewPresenter::forAuthor($manuscript),
            'revisionDueAt' => $manuscript->revision_due_at?->toIso8601String(),
            // Where it will be or was published: the issue, pages, DOI and the article on the site.
            'publication' => [
                'issue' => $manuscript->journalIssue?->label(),
                'year' => $manuscript->publication_year,
                'pages' => $manuscript->first_page ? $manuscript->first_page.($manuscript->last_page && $manuscript->last_page !== $manuscript->first_page ? '–'.$manuscript->last_page : '') : null,
                'doi' => $manuscript->doi,
                'publishedAt' => $manuscript->published_at?->toIso8601String(),
                'articleUrl' => $manuscript->article ? route('articles.show', [$manuscript->article->issue, $manuscript->article->number]) : null,
            ],
            // Messages the editorial office addressed to the authors (internal notes stay internal).
            'messages' => $manuscript->notes()->where('visible_to_author', true)->latest('id')->get()
                ->map(fn (ManuscriptNote $n) => ['id' => $n->id, 'body' => $n->body, 'at' => $n->created_at?->toIso8601String()])
                ->values()->all(),
        ]);
    }

    public function destroy(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('delete', $manuscript);

        $this->workflow->discard($manuscript);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('The draft has been deleted.')]);

        return to_route('author.manuscripts.index');
    }
}
