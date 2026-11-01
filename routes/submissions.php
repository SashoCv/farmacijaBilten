<?php

use App\Http\Controllers\Admin\SubmissionAdminController;
use App\Http\Controllers\SubmissionFileController;
use Illuminate\Support\Facades\Route;

/*
| Manuscript submission pipeline (WS7). Required from routes/web.php, inside
| the "web" middleware group. The form itself posts to `submissions.store`
| and the editors' list is `admin.submissions.index` (both in web.php).
*/

// Signed, expiring file links from the editors' e-mail and the admin list.
// The signature is the access control, so no sign-in is needed.
Route::get('submissions/{submission}/files/{file}', SubmissionFileController::class)
    ->whereNumber('submission')
    ->where('file', 'manuscript|form-[1-9]')
    ->middleware(['signed', 'throttle:60,1'])
    ->name('submissions.file');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('admin/submissions/export', [SubmissionAdminController::class, 'export'])
        ->name('admin.submissions.export');
});
