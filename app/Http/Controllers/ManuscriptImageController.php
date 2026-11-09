<?php

namespace App\Http\Controllers;

use App\Manuscripts\ImageStore;
use App\Models\Manuscript;
use App\Models\ManuscriptImage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Figure images of a manuscript: the author uploads them while writing;
 * whoever may see the manuscript (its author, the editorial office) may see
 * its images. Never public.
 */
class ManuscriptImageController extends Controller
{
    public function store(Request $request, Manuscript $manuscript, ImageStore $images): JsonResponse
    {
        Gate::authorize('update', $manuscript);

        $request->validate([
            'image' => ['required', 'file', 'max:'.ImageStore::MAX_KB, 'mimetypes:image/png,image/jpeg,image/webp,image/gif'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $image = $images->store($manuscript, $request->file('image'), $user);
        $image->setRelation('manuscript', $manuscript);

        return response()->json([
            'id' => $image->public_id,
            'url' => $image->url(),
            'width' => $image->width,
            'height' => $image->height,
        ], 201);
    }

    public function show(Manuscript $manuscript, ManuscriptImage $image): StreamedResponse
    {
        Gate::authorize('view', $manuscript);

        abort_unless($image->manuscript_id === $manuscript->id, 404);

        return Storage::disk('local')->response($image->path, null, [
            'Content-Type' => $image->mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
