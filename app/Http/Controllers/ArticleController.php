<?php

namespace App\Http\Controllers;

use App\Journal\Seo\SeoMeta;
use App\Models\Article;
use App\Models\Issue;
use App\Support\JournalFiles;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function __invoke(string $issue, string $article): Response
    {
        $found = Issue::query()->withArticleStats()->where('slug', $issue)->firstOrFail();
        $item = $found->articles()->where('number', $article)->firstOrFail()->setRelation('issue', $found);

        $related = $found->articles()
            ->where('number', '!=', $article)
            ->where('position', '>', $item->position)
            ->limit(3)
            ->get();

        if ($related->count() < 3) {
            $related = $related->merge(
                $found->articles()->where('number', '!=', $article)->limit(3 - $related->count())->get(),
            )->unique('id');
        }

        return Inertia::render('journal/article', [
            'issue' => $found->present(),
            'article' => $item->present(),
            // Absolute PDF address (kept for API compatibility; the scholar tags come from SeoMeta).
            'pdfUrl' => $item->pdf ? url(JournalFiles::url($item->pdf)) : null,
            'related' => $related->values()
                ->map(fn (Article $a) => $a->setRelation('issue', $found)->presentSummary()),
        ])->withViewData(['meta' => SeoMeta::forArticle($item)]);
    }
}
