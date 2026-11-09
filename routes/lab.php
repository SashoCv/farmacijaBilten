<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
| Release 0 spikes for the editorial back-office (docs/backoffice/README.md).
| Loaded from routes/web.php in the local environment only.
*/

Route::prefix('lab')->name('lab.')->group(function () {
    // S1: journal tables in the TipTap editor, round-tripped through JSON.
    Route::get('editor', fn () => Inertia::render('lab/editor'))->name('editor');
});
