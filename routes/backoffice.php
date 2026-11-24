<?php

use App\Http\Controllers\Admin\ArchiveAdminController;
use App\Http\Controllers\Admin\CrossrefAdminController;
use App\Http\Controllers\Admin\IssueAdminController;
use App\Http\Controllers\Admin\MailTemplateAdminController;
use App\Http\Controllers\Admin\ManuscriptAdminController;
use App\Http\Controllers\Admin\ReviewAdminController;
use App\Http\Controllers\Admin\ReviewerAdminController;
use App\Http\Controllers\Admin\ReviewerInviteAdminController;
use App\Http\Controllers\Admin\SubmissionAdminController;
use App\Http\Controllers\Admin\UserAdminController;
use App\Http\Controllers\Author\ManuscriptController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\ManuscriptDocxController;
use App\Http\Controllers\ManuscriptImageController;
use App\Http\Controllers\ManuscriptPdfController;
use App\Http\Controllers\Reviewer\ReviewController;
use App\Http\Controllers\ReviewerSignupController;
use App\Http\Controllers\ReviewFileController;
use Illuminate\Support\Facades\Route;

/*
| The editorial back-office (docs/backoffice): everyone signed in lands on a
| dashboard for the roles they hold; the editorial office's pages need the
| admin role and, in production, a second factor.
*/

Route::middleware(['auth', 'verified', 'role'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

// Figure images: for whoever may see the manuscript (ManuscriptPolicy::view).
Route::get('manuscripts/{manuscript}/images/{image}', [ManuscriptImageController::class, 'show'])
    ->middleware(['auth', 'verified', 'role'])
    ->name('manuscripts.image');

// The manuscript as a Word file in the journal's layout.
Route::get('manuscripts/{manuscript}/docx', ManuscriptDocxController::class)
    ->middleware(['auth', 'verified', 'role', 'throttle:30,1'])
    ->name('manuscripts.docx');

// The manuscript as a PDF in the journal layout (WeasyPrint: slower, fewer per minute).
Route::get('manuscripts/{manuscript}/pdf', ManuscriptPdfController::class)
    ->middleware(['auth', 'verified', 'role', 'throttle:10,1'])
    ->name('manuscripts.pdf');

// The invitation e-mail's link (signed, carries the invitation's secret):
// sign in, or create a reviewer account in one step.
Route::middleware(['signed', 'throttle:30,1'])->group(function () {
    Route::get('invitations/{assignment}', [InvitationController::class, 'show'])->name('invitations.show');
    Route::post('invitations/{assignment}', [InvitationController::class, 'createAccount'])->name('invitations.account');

    // Joining the list of reviewers (invited from the Reviewers page).
    Route::get('reviewer-signup/{invite}', [ReviewerSignupController::class, 'show'])->name('reviewer-signup.show');
    Route::post('reviewer-signup/{invite}', [ReviewerSignupController::class, 'store'])->name('reviewer-signup.store');
});

// Files attached to reviews (ReviewFileController decides who may see each).
Route::get('review-files/{file}', ReviewFileController::class)
    ->middleware(['auth', 'verified', 'role'])
    ->name('review-files.show');

// Reviewers: invitations, the manuscript and the review form.
Route::middleware(['auth', 'verified', 'role'])
    ->prefix('reviewer/reviews')
    ->name('reviewer.reviews.')
    ->controller(ReviewController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{assignment}', 'show')->name('show');
        Route::post('{assignment}/respond', 'respond')->name('respond');
        Route::put('{assignment}', 'update')->middleware('throttle:120,1')->name('update');
        Route::post('{assignment}/submit', 'submit')->name('submit');
        Route::post('{assignment}/files', 'upload')->middleware('throttle:30,1')->name('files.store');
        Route::delete('{assignment}/files/{file}', 'destroyFile')->name('files.destroy');
    });

// Authors: write on the journal template, send, follow the status.
Route::middleware(['auth', 'verified', 'role:author'])
    ->prefix('author/manuscripts')
    ->name('author.manuscripts.')
    ->controller(ManuscriptController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->middleware('throttle:20,60')->name('store');
        Route::get('{manuscript}', 'show')->name('show');
        Route::get('{manuscript}/edit', 'edit')->name('edit');
        Route::put('{manuscript}/draft', 'saveDraft')->middleware('throttle:120,1')->name('draft');
        Route::get('{manuscript}/preview', 'preview')->name('preview');
        Route::post('{manuscript}/submit', 'submit')->name('submit');
        Route::post('{manuscript}/images', [ManuscriptImageController::class, 'store'])
            ->middleware('throttle:60,1')
            ->name('images.store');
        Route::delete('{manuscript}', 'destroy')->name('destroy');
    });

Route::middleware(['auth', 'verified', 'role:admin', 'admin.2fa'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('manuscripts', [ManuscriptAdminController::class, 'index'])->name('manuscripts.index');
        Route::get('manuscripts/{manuscript}', [ManuscriptAdminController::class, 'show'])->name('manuscripts.show');
        Route::put('manuscripts/{manuscript}/publication', [ManuscriptAdminController::class, 'updatePublication'])->name('manuscripts.publication');
        Route::post('manuscripts/{manuscript}/reviewers', [ReviewAdminController::class, 'invite'])->name('manuscripts.reviewers.store');
        Route::get('reviewers', ReviewerAdminController::class)->name('reviewers.index');
        Route::post('reviewers', [ReviewerInviteAdminController::class, 'store'])->middleware('throttle:30,1')->name('reviewers.store');
        Route::post('reviewer-invites/{invite}/resend', [ReviewerInviteAdminController::class, 'resend'])->middleware('throttle:30,1')->name('reviewer-invites.resend');
        Route::delete('reviewer-invites/{invite}', [ReviewerInviteAdminController::class, 'destroy'])->name('reviewer-invites.destroy');

        // The wording of the system's e-mails.
        Route::get('mail-templates', [MailTemplateAdminController::class, 'index'])->name('mail-templates.index');
        Route::get('mail-templates/{key}', [MailTemplateAdminController::class, 'edit'])->name('mail-templates.edit');
        Route::put('mail-templates/{key}', [MailTemplateAdminController::class, 'update'])->name('mail-templates.update');
        Route::post('mail-templates/{key}/reset', [MailTemplateAdminController::class, 'reset'])->name('mail-templates.reset');
        Route::post('mail-templates/{key}/preview', [MailTemplateAdminController::class, 'preview'])->middleware('throttle:60,1')->name('mail-templates.preview');

        // Preparing issues and publishing accepted manuscripts.
        Route::post('issues', [IssueAdminController::class, 'store'])->name('issues.store');
        Route::get('issues/{issue}', [IssueAdminController::class, 'show'])->name('issues.show');
        Route::post('issues/{issue}/order', [IssueAdminController::class, 'reorder'])->name('issues.reorder');
        Route::post('issues/{issue}/close', [IssueAdminController::class, 'close'])->name('issues.close');
        Route::post('manuscripts/{manuscript}/issue', [IssueAdminController::class, 'assign'])->name('manuscripts.issue');
        Route::post('manuscripts/{manuscript}/publish', [IssueAdminController::class, 'publish'])->name('manuscripts.publish');

        // The published archive, read-only: the original PDFs in the old layout.
        Route::get('archive', [ArchiveAdminController::class, 'index'])->name('archive.index');
        Route::get('archive-dois', [ArchiveAdminController::class, 'dois'])->name('archive.dois');

        // Crossref: depositor settings, an issue's deposit file, sending it.
        Route::put('crossref/settings', [CrossrefAdminController::class, 'settings'])->name('crossref.settings');
        Route::put('crossref/account', [CrossrefAdminController::class, 'account'])
            ->middleware('throttle:10,1')->name('crossref.account');
        Route::get('crossref/issues/{issue}/xml', [CrossrefAdminController::class, 'xml'])->name('crossref.xml');
        Route::post('crossref/issues/{issue}/deposit', [CrossrefAdminController::class, 'deposit'])
            ->middleware('throttle:10,1')->name('crossref.deposit');
        Route::get('crossref/issues/{issue}/articles/{number}/xml', [CrossrefAdminController::class, 'articleXml'])->name('crossref.article.xml');
        Route::post('crossref/issues/{issue}/articles/{number}/deposit', [CrossrefAdminController::class, 'articleDeposit'])
            ->middleware('throttle:30,1')->name('crossref.article.deposit');
        Route::post('crossref/deposits/{deposit}/check', [CrossrefAdminController::class, 'check'])
            ->middleware('throttle:20,1')->name('crossref.check');
        Route::get('archive/{issue}', [ArchiveAdminController::class, 'issue'])->name('archive.issue');
        Route::get('archive/{issue}/{number}', [ArchiveAdminController::class, 'show'])->name('archive.article');
        Route::post('manuscripts/{manuscript}/decision', [ReviewAdminController::class, 'decide'])->name('manuscripts.decision');
        Route::post('manuscripts/{manuscript}/notes', [ManuscriptAdminController::class, 'storeNote'])->name('manuscripts.notes.store');
        Route::post('assignments/{assignment}/cancel', [ReviewAdminController::class, 'cancel'])->name('assignments.cancel');
        Route::post('assignments/{assignment}/remind', [ReviewAdminController::class, 'remind'])->middleware('throttle:10,1')->name('assignments.remind');

        // Manuscripts sent with the public form before the back-office existed.
        Route::get('submissions', [SubmissionAdminController::class, 'index'])->name('submissions.index');

        // People and roles: the password is asked again before this list opens.
        Route::middleware('password.confirm')->group(function () {
            Route::get('users', [UserAdminController::class, 'index'])->name('users.index');
            Route::put('users/{user}/roles', [UserAdminController::class, 'updateRoles'])->name('users.roles');
            Route::put('users/{user}/status', [UserAdminController::class, 'updateStatus'])->name('users.status');
        });
    });
