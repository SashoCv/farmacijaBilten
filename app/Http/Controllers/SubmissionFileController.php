<?php

namespace App\Http\Controllers;

use App\Models\Submission;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves a submitted file to whoever holds a valid signed link (the route
 * carries the "signed" middleware): editors following the link in the
 * notification e-mail, or the admin list.
 */
class SubmissionFileController extends Controller
{
    public function __invoke(Submission $submission, string $file): StreamedResponse
    {
        $entry = $submission->file($file);
        $disk = Storage::disk('local');

        abort_if($entry === null || ! $disk->exists($entry['path']), 404);

        return $disk->download($entry['path'], $entry['name'], [
            'Cache-Control' => 'private, no-store',
            'X-Robots-Tag' => 'noindex, nofollow',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
