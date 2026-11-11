<?php

namespace App\Http\Controllers\Admin;

use App\Crossref\Crossref;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use App\Models\Issue;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * DOI registration from the back-office: the depositor settings, the
 * deposit file of an issue (download) and sending it to Crossref.
 */
class CrossrefAdminController extends Controller
{
    /** The journal's Crossref account, so that deposits are sent from here. */
    public function account(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'username' => ['nullable', 'string', 'max:200'],
            // Empty: keep the saved password.
            'password' => ['nullable', 'string', 'max:200'],
            'mode' => ['required', 'in:test,live'],
            'forget' => ['boolean'],
        ]);

        if (! empty($data['forget'])) {
            Setting::put(Crossref::SETTING_USERNAME, null);
            Setting::put(Crossref::SETTING_PASSWORD, null);
            Setting::put(Crossref::SETTING_AUTO, '0');
            Inertia::flash('toast', ['type' => 'success', 'message' => __('The Crossref account was removed.')]);

            return back();
        }

        if (blank($data['username'] ?? null)) {
            throw ValidationException::withMessages(['username' => __('Enter the Crossref username.')]);
        }

        if (blank($data['password'] ?? null) && blank(Setting::get(Crossref::SETTING_PASSWORD))) {
            throw ValidationException::withMessages(['password' => __('Enter the Crossref password.')]);
        }

        Setting::put(Crossref::SETTING_USERNAME, trim((string) $data['username']));

        if (filled($data['password'] ?? null)) {
            Setting::put(Crossref::SETTING_PASSWORD, Crypt::encryptString((string) $data['password']));
        }

        Setting::put(Crossref::SETTING_MODE, $data['mode']);

        Inertia::flash('toast', ['type' => 'success', 'message' => $data['mode'] === 'live'
            ? __('Crossref account saved. Deposits now register real DOIs.')
            : __('Crossref account saved, in test mode: deposits are checked but nothing is registered.')]);

        return back();
    }

    public function settings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'depositor_name' => ['required', 'string', 'max:120'],
            'depositor_email' => ['required', 'email', 'max:200'],
            'auto' => ['boolean'],
        ]);

        Setting::put(Crossref::SETTING_NAME, trim($data['depositor_name']));
        Setting::put(Crossref::SETTING_EMAIL, trim($data['depositor_email']));
        Setting::put(Crossref::SETTING_AUTO, ! empty($data['auto']) ? '1' : '0');

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Crossref settings saved.')]);

        return back();
    }

    /** The deposit file of the issue's DOIs that are not registered yet. */
    public function xml(Issue $issue): Response
    {
        $xml = Crossref::xml($issue, Crossref::pending($issue), Crossref::batchId($issue));

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="crossref-'.$issue->slug.'.xml"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** The deposit file of one article. */
    public function articleXml(Issue $issue, string $number): Response
    {
        $article = $this->pendingArticle($issue, $number);
        $xml = Crossref::xml($issue, collect([$article]), Crossref::batchId($issue));

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="crossref-'.$issue->slug.'-'.$article->number.'.xml"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Send one article's DOI to Crossref. */
    public function articleDeposit(Request $request, Issue $issue, string $number): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $article = $this->pendingArticle($issue, $number);
        Crossref::deposit($issue, collect([$article]), 'button', $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':doi sent to Crossref. The result comes within minutes.', ['doi' => $article->doi])]);

        return back();
    }

    /** An article of the issue whose DOI may be deposited (not registered, not to check by hand). */
    private function pendingArticle(Issue $issue, string $number): Article
    {
        $article = Crossref::pending($issue)->first(fn (Article $a) => $a->number === $number);

        if ($article === null) {
            abort_unless($issue->articles()->where('number', $number)->exists(), 404);

            throw ValidationException::withMessages(['crossref' => __('This DOI is already registered, or it must be checked by hand first.')]);
        }

        return $article;
    }

    /** Ask Crossref for the result of a sent deposit now. */
    public function check(CrossrefDeposit $deposit): RedirectResponse
    {
        if ($deposit->status === 'sent') {
            Crossref::check($deposit);
        }

        Inertia::flash('toast', $deposit->status === 'sent'
            ? ['type' => 'info', 'message' => __('Crossref is still processing the deposit. Try again in a few minutes.')]
            : ['type' => $deposit->status === 'succeeded' ? 'success' : 'error', 'message' => __('Crossref has answered: see the deposit.')]);

        return back();
    }

    public function deposit(Request $request, Issue $issue): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $articles = Crossref::pending($issue);
        Crossref::deposit($issue, $articles, 'button', $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => trans_choice('{1} One DOI sent to Crossref. The result comes within minutes.|[2,*] :count DOIs sent to Crossref. The result comes within minutes.', $articles->count(), ['count' => $articles->count()])]);

        return back();
    }
}
