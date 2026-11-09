<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\ReviewFile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * A reviewer's file: for the editorial office, for the reviewer who added
 * it, and for the authors when it is marked for them and the decision of
 * that round has been sent. The download name never reveals the reviewer.
 */
class ReviewFileController extends Controller
{
    public function __invoke(Request $request, ReviewFile $file): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();
        $assignment = $file->assignment;
        $manuscript = $assignment->manuscript;

        $allowed = $user->hasRole(Role::Admin)
            || $assignment->reviewer_id === $user->id
            || ($file->visibility === 'author'
                && $manuscript->submitter_id === $user->id
                && $manuscript->decisions()->where('round', $assignment->round)->exists());

        abort_unless($allowed && $user->isActive(), 403);

        $name = $manuscript->submitter_id === $user->id && ! $user->hasRole(Role::Admin)
            ? "Reviewer {$assignment->number} - {$file->name}"
            : $file->name;

        return Storage::disk('local')->download($file->path, $name, ['Cache-Control' => 'private, no-store']);
    }
}
