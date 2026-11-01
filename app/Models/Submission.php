<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * A manuscript sent through the website's submission form.
 *
 * Files live on the private "local" disk and are only reachable through
 * signed, expiring links (route "submissions.file").
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $name
 * @property string $email
 * @property string|null $affiliation
 * @property string $title
 * @property string $type
 * @property string|null $message
 * @property string $file_path
 * @property string $file_name
 * @property int $file_size
 * @property list<array{path: string, name: string, size: int}>|null $forms Signed forms on the "local" disk.
 * @property string|null $suggested_reviewers
 * @property string $status
 * @property string|null $ip
 * @property Carbon|null $privacy_accepted_at
 * @property string|null $reference "MPB-2026-0042", stored when the row is created.
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Submission extends Model
{
    /** Paper types offered on the form, as in "Types of paper" of the instructions for authors. */
    public const TYPES = [
        'Original scientific paper',
        'Short communication',
        'Review paper',
        'Professional paper',
    ];

    /** File types accepted for the manuscript. */
    public const MANUSCRIPT_EXTENSIONS = ['doc', 'docx', 'pdf', 'odt', 'rtf'];

    /** Signed forms (Author Disclosure, Ethical Responsibility). */
    public const FORM_EXTENSIONS = ['pdf', 'docx'];

    public const MAX_FORMS = 2;

    /** Largest signed form, in kilobytes. */
    public const FORM_MAX_KB = 5120;

    /**
     * Largest total size attached to the editors' e-mail. Bigger files are
     * only linked: base64 makes a 10 MB file about 13.5 MB on the wire, which
     * is near the limit of many university mail servers.
     */
    public const ATTACHMENT_LIMIT_BYTES = 10 * 1024 * 1024;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'forms' => 'array',
            'file_size' => 'integer',
            'privacy_accepted_at' => 'datetime',
            'reference' => 'string',
        ];
    }

    protected static function booted(): void
    {
        // The reference needs the id, so it is written right after the insert.
        static::created(function (Submission $submission) {
            if ($submission->reference === null) {
                $submission->forceFill([
                    'reference' => self::formatReference($submission->id, $submission->created_at ?? now()),
                ])->saveQuietly();
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** "MPB-2026-0042": year of submission and the row id, zero-padded. */
    public static function formatReference(int $id, \DateTimeInterface $date): string
    {
        return sprintf('MPB-%s-%04d', $date->format('Y'), $id);
    }

    /**
     * Form settings for the frontend (`SubmissionConfig` in submission-form.tsx).
     *
     * @return array{types: list<string>, maxMb: int, formsMaxMb: int, maxForms: int, manuscriptExtensions: list<string>, formExtensions: list<string>}
     */
    public static function formConfig(): array
    {
        return [
            'types' => self::TYPES,
            'maxMb' => self::manuscriptMaxMb(),
            'formsMaxMb' => (int) round(self::FORM_MAX_KB / 1024),
            'maxForms' => self::MAX_FORMS,
            'manuscriptExtensions' => self::MANUSCRIPT_EXTENSIONS,
            'formExtensions' => self::FORM_EXTENSIONS,
        ];
    }

    public static function manuscriptMaxMb(): int
    {
        return (int) round(config('journal.submission_max_kb') / 1024);
    }

    /**
     * A file name that is safe in a Content-Disposition header and on any
     * file system: no path parts, quotes or control characters, at most 120
     * characters, and always ending in the extension the file was stored with.
     */
    public static function safeFileName(string $original, string $extension): string
    {
        $base = pathinfo(str_replace('\\', '/', $original), PATHINFO_FILENAME);
        $base = preg_replace('/[^\pL\pN ._()-]+/u', '_', $base) ?? '';
        $base = trim(preg_replace('/[\s_]+/u', ' ', $base) ?? '', ' ._-');
        $base = Str::limit($base, 110, '') ?: 'file';

        return $base.'.'.strtolower($extension);
    }

    /**
     * Every stored file of this submission, the manuscript first.
     *
     * @return list<array{key: string, kind: 'manuscript'|'form', path: string, name: string, size: int}>
     */
    public function files(): array
    {
        $files = [[
            'key' => 'manuscript',
            'kind' => 'manuscript',
            'path' => $this->file_path,
            'name' => $this->file_name,
            'size' => $this->file_size,
        ]];

        foreach ($this->forms ?? [] as $i => $form) {
            $files[] = [
                'key' => 'form-'.($i + 1),
                'kind' => 'form',
                'path' => $form['path'],
                'name' => $form['name'],
                'size' => (int) $form['size'],
            ];
        }

        return $files;
    }

    /** @return array{key: string, kind: 'manuscript'|'form', path: string, name: string, size: int}|null */
    public function file(string $key): ?array
    {
        foreach ($this->files() as $file) {
            if ($file['key'] === $key) {
                return $file;
            }
        }

        return null;
    }

    /** Signed, expiring link to one of the files; works without signing in. */
    public function fileUrl(string $key, \DateTimeInterface $expires): string
    {
        return URL::temporarySignedRoute('submissions.file', $expires, [
            'submission' => $this->id,
            'file' => $key,
        ]);
    }

    /**
     * Row for the editors' list (`AdminSubmission` in pages/admin/submissions/index.tsx).
     *
     * @return array<string, mixed>
     */
    public function presentForAdmin(\DateTimeInterface $linksExpire): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'submittedAt' => $this->created_at?->toIso8601String(),
            'title' => $this->title,
            'type' => $this->type,
            'name' => $this->name,
            'email' => $this->email,
            'affiliation' => $this->affiliation,
            'message' => $this->message,
            'reviewers' => $this->suggested_reviewers,
            'status' => $this->status,
            'files' => array_map(fn (array $file) => [
                'key' => $file['key'],
                'kind' => $file['kind'],
                'name' => $file['name'],
                'size' => $file['size'],
                // Null only while routes/submissions.php is not loaded.
                'url' => Route::has('submissions.file') ? $this->fileUrl($file['key'], $linksExpire) : null,
            ], $this->files()),
        ];
    }
}
