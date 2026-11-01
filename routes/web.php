<?php

use App\Http\Controllers\Admin\SubmissionAdminController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\BrowseController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LegacyRedirectController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\OaiController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SubmissionController;
use Illuminate\Support\Facades\Route;

/*
| Owned by the foundation; later changes go through the lead.
*/

$issue = '\d+(?:-s?\d+)?';

Route::get('/', HomeController::class)->name('home');

Route::controller(BrowseController::class)->group(function () use ($issue) {
    Route::get('archive', 'archive')->name('archive');
    Route::get('early-online', 'earlyOnline')->name('early-online');
    Route::get('issues/{issue}', 'issue')
        ->where('issue', $issue)
        ->name('issues.show');
});

Route::get('articles/{issue}/{article}', ArticleController::class)
    ->where(['issue' => $issue, 'article' => '\d{3,4}'])
    ->name('articles.show');

Route::get('search', SearchController::class)->name('search');

// Journal information pages.
Route::controller(PageController::class)->group(function () {
    Route::get('about', 'about')->name('about');
    Route::get('indexing', 'indexing')->name('indexing');
    Route::get('contact', 'contact')->name('contact');
    Route::get('privacy', 'privacy')->name('privacy');
    Route::get('accessibility', 'accessibility')->name('accessibility');
});

Route::get('locale/{locale}', LocaleController::class)
    ->whereIn('locale', ['en', 'mk'])
    ->name('locale');

Route::post('submit-your-paper', [SubmissionController::class, 'store'])
    ->middleware('throttle:5,60')
    ->name('submissions.store');

// Machine-readable endpoints for indexers.
Route::get('sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('sitemaps/{type}.xml', [SitemapController::class, 'show'])
    ->whereIn('type', SitemapController::TYPES)
    ->name('sitemaps.show');
Route::get('feed', [FeedController::class, 'latest'])->name('feed');
Route::get('feed/early-online', [FeedController::class, 'earlyOnline'])->name('feed.early-online');
Route::match(['get', 'post'], 'oai', OaiController::class)->name('oai');

Route::get('{path}', [PageController::class, 'show'])
    ->where('path', PageController::PATHS)
    ->name('pages.show');

// Addresses from the old WordPress site ("/index.php/..." is handled by LegacyPathNormalizer).
Route::permanentRedirect('editorial-policies', '/guidelines/editorial-policies');
Route::permanentRedirect('instructions-for-authors', '/guidelines/instructions-for-authors');

Route::controller(LegacyRedirectController::class)->group(function () {
    Route::get('wp-content/uploads/{path}', 'upload')->where('path', '.+');
    Route::get('wp-includes/images/{file}', 'includesImage')->where('file', '[^/]+');
    Route::get('wp-sitemap.xml', 'sitemap');
    Route::get('comments/feed', 'commentsFeed');
    Route::get('{post}', 'post')
        ->where('post', 'volume-[a-z0-9-]+|\d+-supp-\d+|\d+_\d+_\d+-[a-z0-9-]+');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Editors land on the submissions list after signing in.
    Route::redirect('dashboard', '/admin/submissions')->name('dashboard');

    Route::get('admin/submissions', [SubmissionAdminController::class, 'index'])
        ->name('admin.submissions.index');
});

require __DIR__.'/settings.php';
require __DIR__.'/submissions.php';
