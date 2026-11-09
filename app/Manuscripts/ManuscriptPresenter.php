<?php

namespace App\Manuscripts;

use App\Manuscripts\Rendering\ManuscriptRenderer;
use App\Models\Manuscript;
use App\Models\ManuscriptEvent;
use App\Models\ManuscriptImage;

/**
 * Manuscripts in the shapes of resources/js/types/manuscript.ts.
 */
final class ManuscriptPresenter
{
    /** @return array<string, mixed> ManuscriptSummary */
    public static function summary(Manuscript $m, string $url, bool $withSubmitter = false): array
    {
        $out = [
            'id' => $m->public_id,
            'reference' => $m->reference,
            'title' => $m->title,
            'type' => $m->type,
            'typeLabel' => $m->typeLabel(),
            'language' => $m->language,
            'status' => $m->status->value,
            'submittedAt' => $m->submitted_at?->toIso8601String(),
            'updatedAt' => $m->updated_at?->toIso8601String(),
            'url' => $url,
        ];

        if ($withSubmitter) {
            $out['submitter'] = ['id' => $m->submitter->id, 'name' => $m->submitter->name, 'email' => $m->submitter->email];
        }

        return $out;
    }

    /**
     * The content to show: the latest frozen version once sent, else the draft.
     *
     * @return array<string, mixed>
     */
    public static function content(Manuscript $m): array
    {
        $version = $m->latestVersion();

        return Content::normalise((array) ($version !== null ? $version->content : $m->draft?->content));
    }

    /** @param  array<string, mixed>  $content */
    public static function authorsLine(array $content): string
    {
        return implode(', ', array_map(
            fn (array $a) => trim($a['givenName'].' '.$a['familyName']),
            (array) ($content['authors'] ?? []),
        ));
    }

    /** @param  array<string, mixed>  $content */
    public static function html(Manuscript $m, array $content): string
    {
        $date = fn ($d) => $d?->locale($m->language)->translatedFormat('F Y');

        return ManuscriptRenderer::render($content, [
            'type' => $m->type,
            'language' => $m->language,
            'receivedAt' => $date($m->received_at),
            'citation' => $m->citationLine(),
            'doi' => $m->doi,
            'images' => self::imageUrls($m),
        ]);
    }

    /** @return array<string, string> Image public id => URL. */
    public static function imageUrls(Manuscript $m): array
    {
        return $m->images()->get()->mapWithKeys(fn (ManuscriptImage $image) => [
            $image->public_id => route('manuscripts.image', [$m->public_id, $image->public_id]),
        ])->all();
    }

    /** @return list<array<string, mixed>> ManuscriptEvent[] */
    public static function events(Manuscript $m, bool $forAuthor = false): array
    {
        $events = $m->events()->with('actor')->orderBy('id')->get();

        // The authors see what happened to their paper, never who reviews it:
        // reviewer events are hidden and actors are "the editorial office".
        if ($forAuthor) {
            $events = $events->filter(fn (ManuscriptEvent $e) => in_array($e->type, self::AUTHOR_EVENTS, true));
        }

        return array_values($events->map(fn (ManuscriptEvent $e) => [
            'id' => $e->id,
            'type' => $e->type,
            'fromStatus' => $e->from_status?->value,
            'toStatus' => $e->to_status?->value,
            'actor' => $forAuthor
                ? ($e->actor_id === $m->submitter_id ? $e->actor?->name : __('Editorial office'))
                : $e->actor?->name,
            'at' => $e->created_at?->toIso8601String(),
            'note' => null,
        ])->all());
    }

    /** History events an author may see (status changes and their own actions). */
    private const AUTHOR_EVENTS = ['submitted', 'under_review', 'decision', 'resubmitted', 'publication_details_updated', 'note_to_author', 'assigned_to_issue', 'removed_from_issue', 'published'];
}
