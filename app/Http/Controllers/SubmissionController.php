<?php

namespace App\Http\Controllers;

use App\Models\Submission;
use App\Notifications\ManuscriptSubmitted;
use App\Notifications\SubmissionReceipt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SubmissionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        // The public form is closed: authors sign in and write in the system.
        if (! config('journal.guest_submissions')) {
            return redirect()->route('register');
        }

        // Bots fill every field; people never see this one.
        if (filled($request->input('website'))) {
            return back();
        }

        $data = $request->validate($this->rules(), $this->messages());

        $folder = 'submissions/'.now()->format('Y');
        $manuscript = $this->storeFile($request->file('manuscript'), $folder, Submission::MANUSCRIPT_EXTENSIONS);

        // An empty file input arrives as null; keep only real uploads.
        $uploadedForms = array_filter((array) $request->file('forms', []), fn ($file) => $file instanceof UploadedFile);
        $forms = array_map(
            fn (UploadedFile $file) => $this->storeFile($file, $folder, Submission::FORM_EXTENSIONS),
            array_values($uploadedForms),
        );

        $submission = Submission::create([
            'user_id' => $request->user()?->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'affiliation' => $data['affiliation'] ?? null,
            'title' => $data['title'],
            'type' => $data['type'],
            'message' => $data['message'] ?? null,
            'suggested_reviewers' => $data['reviewers'] ?? null,
            'file_path' => $manuscript['path'],
            'file_name' => $manuscript['name'],
            'file_size' => $manuscript['size'],
            'forms' => $forms ?: null,
            'privacy_accepted_at' => now(),
            'ip' => $request->ip(),
        ]);

        $reference = (string) $submission->reference;
        $editors = config('journal.submissions_email');

        if ($editors) {
            Notification::route('mail', $editors)->notify(new ManuscriptSubmitted($submission));
        } else {
            Log::warning("Submission {$reference} stored, but JOURNAL_SUBMISSIONS_EMAIL is not set; it is only visible at /admin/submissions.");
        }

        // The receipt goes out in the language the author used on the site.
        Notification::route('mail', $submission->email)
            ->notify((new SubmissionReceipt($submission))->locale(app()->getLocale()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Manuscript received. Your reference is :reference.', ['reference' => $reference])]);

        return to_route('pages.show', 'submit-your-paper')->with('submitted', $reference);
    }

    /** @return array<string, list<mixed>> */
    private function rules(): array
    {
        $manuscript = Submission::MANUSCRIPT_EXTENSIONS;
        $forms = Submission::FORM_EXTENSIONS;

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'affiliation' => ['nullable', 'string', 'max:300'],
            'title' => ['required', 'string', 'max:500'],
            'type' => ['required', Rule::in(Submission::TYPES)],
            'manuscript' => [
                'required',
                'file',
                'extensions:'.implode(',', $manuscript),
                'mimes:'.implode(',', $manuscript),
                'max:'.config('journal.submission_max_kb'),
            ],
            'forms' => ['nullable', 'array', 'max:'.Submission::MAX_FORMS],
            'forms.*' => [
                'nullable',
                'file',
                'extensions:'.implode(',', $forms),
                'mimes:'.implode(',', $forms),
                'max:'.Submission::FORM_MAX_KB,
            ],
            'reviewers' => ['nullable', 'string', 'max:3000'],
            'message' => ['nullable', 'string', 'max:3000'],
            'consent' => ['accepted'],
            'privacy' => ['accepted'],
        ];
    }

    /**
     * Plain, specific messages (they also appear in the error summary).
     * Macedonian versions live in lang/mk.json.
     *
     * @return array<string, string>
     */
    private function messages(): array
    {
        $manuscriptTypes = __('Upload the manuscript as a Word document (.doc, .docx), PDF, ODT or RTF file.');
        $manuscriptSize = __('The manuscript file must be :size MB or smaller.', ['size' => Submission::manuscriptMaxMb()]);
        $formTypes = __('Upload the signed forms as PDF or Word (.docx) files.');
        $formSize = __('Each signed form must be :size MB or smaller.', ['size' => (int) round(Submission::FORM_MAX_KB / 1024)]);

        return [
            'name.required' => __('Enter the name of the corresponding author.'),
            'email.required' => __('Enter an e-mail address.'),
            'email.email' => __('Enter a valid e-mail address, for example name@example.org.'),
            'title.required' => __('Enter the title of the manuscript.'),
            'type.required' => __('Choose the type of paper.'),
            'type.in' => __('Choose the type of paper.'),
            'manuscript.required' => __('Choose the manuscript file to upload.'),
            'manuscript.file' => __('Choose the manuscript file to upload.'),
            // PHP drops files above upload_max_filesize before Laravel sees them.
            'manuscript.uploaded' => $manuscriptSize,
            'manuscript.max' => $manuscriptSize,
            'manuscript.extensions' => $manuscriptTypes,
            'manuscript.mimes' => $manuscriptTypes,
            'forms.max' => __('Attach at most :count signed forms.', ['count' => Submission::MAX_FORMS]),
            'forms.*.uploaded' => $formSize,
            'forms.*.max' => $formSize,
            'forms.*.file' => $formTypes,
            'forms.*.extensions' => $formTypes,
            'forms.*.mimes' => $formTypes,
            'consent.accepted' => __('Confirm the submission declaration.'),
            'privacy.accepted' => __('Confirm that you have read the privacy notice.'),
        ];
    }

    /**
     * Stores an upload under a random name with the extension guessed from
     * its content (never the client's), and returns a sanitised display name.
     *
     * @param  list<string>  $allowed
     * @return array{path: string, name: string, size: int}
     */
    private function storeFile(UploadedFile $file, string $folder, array $allowed): array
    {
        $extension = $file->guessExtension();

        // Validation already matched content and name; fall back to the
        // client's extension only when it is one of the allowed ones.
        if (! in_array($extension, $allowed, true)) {
            $extension = strtolower($file->getClientOriginalExtension());
        }

        $path = $file->storeAs($folder, Str::uuid().'.'.$extension, 'local');

        return [
            'path' => (string) $path,
            'name' => Submission::safeFileName($file->getClientOriginalName(), $extension),
            'size' => (int) $file->getSize(),
        ];
    }
}
