<?php

namespace App\Http\Controllers;

use App\Journal\Search\ArticleSearch;
use App\Journal\Search\ScopeTopics;
use App\Journal\Search\SearchIndex;
use App\Journal\Seo\SeoMeta;
use App\Models\Page;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function __invoke(Request $request): Response
    {
        SearchIndex::ensureFresh();

        $search = ArticleSearch::fromRequest($request);
        $active = $search->active();
        $page = $active ? $search->paginate((int) $request->integer('page', 1)) : null;
        $empty = $active && $page['total'] === 0;

        return Inertia::render('journal/search', [
            'query' => $search->query,
            // Folded terms: the page marks them in titles, names and excerpts.
            'terms' => $search->terms,
            'filters' => [...$search->filters, 'sort' => $search->sort],
            'results' => $page['results'] ?? [],
            'pagination' => [
                'page' => $page['page'] ?? 1,
                'lastPage' => $page['lastPage'] ?? 1,
                'perPage' => ArticleSearch::PER_PAGE,
                'total' => $page['total'] ?? 0,
            ],
            // Also on the landing page, where they offer browsing by type and issue.
            'facets' => $search->facets(),
            // Only for the "nothing found" state.
            'topics' => $empty ? ScopeTopics::suggestions() : [],
            'scopePath' => $empty && Page::query()->where('path', ScopeTopics::PAGE)->exists() ? ScopeTopics::PAGE : null,
        ])->withViewData(['meta' => SeoMeta::forSearch($search->query)]);
    }
}
