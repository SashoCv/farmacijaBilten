<?php

use App\Enums\Role;
use App\Models\Article;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;

/*
|--------------------------------------------------------------------------
| Scheduled tasks
|--------------------------------------------------------------------------
|
| Run by cron every minute: `* * * * * php /path/to/artisan schedule:run`
| (see DEPLOY.md). Backups are documented in DEPLOY.md.
|
*/

// Failed queue jobs (mostly undelivered e-mails) are kept for two weeks.
Schedule::command('queue:prune-failed --hours=336')->daily()->at('03:10');
Schedule::command('queue:prune-batches --hours=336')->daily()->at('03:15');

// Expired password-reset tokens.
Schedule::command('auth:clear-resets')->daily()->at('03:20');

// Models that define prunable() (none yet; harmless when there are none).
Schedule::command('model:prune')->daily()->at('03:25');

// Peer review: reminders and expiry of unanswered invitations, each morning.
Schedule::command('journal:review-reminders')->dailyAt('08:00')->timezone('Europe/Skopje');

// Keep the SQLite query planner statistics fresh.
Schedule::call(fn () => DB::statement('PRAGMA optimize'))
    ->name('sqlite-optimize')
    ->weekly()
    ->when(fn () => config('database.default') === 'sqlite');

/*
|--------------------------------------------------------------------------
| Operations commands
|--------------------------------------------------------------------------
*/

Artisan::command('journal:editor {email} {--name=}', function (string $email) {
    /** @var Command $this */
    $email = mb_strtolower(trim($email));
    $existing = User::where('email', $email)->first();
    $name = $this->option('name') ?: ($existing === null ? $this->ask('Full name') : $existing->name);
    $password = $existing === null ? $this->secret('Password (at least 12 characters)') : null;

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password],
        [
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => $existing === null ? ['required', 'string', 'min:12'] : ['nullable'],
        ],
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $user = $existing ?? new User;
    [$given, $family] = array_pad(preg_split('/\s+/u', trim((string) $name), 2) ?: [], 2, null);

    $user->forceFill([
        'email' => $email,
        'name' => $name,
        'given_name' => $user->given_name ?? $given,
        'family_name' => $user->family_name ?? $family,
        'email_verified_at' => $user->email_verified_at ?? now(),
        ...($password !== null ? ['password' => $password] : []),
    ])->save();

    $user->grantRole(Role::Admin);

    $this->info(($existing ? 'Gave the editorial office role to' : 'Created the editorial office account')." {$user->email}. Sign in at ".url('/login'));

    if (config('journal.security.admin_requires_2fa')) {
        $this->warn('After signing in, turn on two-factor authentication (Settings → Security): the editorial office pages require it.');
    }

    return 0;
})->purpose('Create an editorial-office (admin) account, or give the admin role to an existing one');

Artisan::command('journal:smoke {--url= : Base URL, defaults to APP_URL}', function () {
    /** @var Command $this */
    $base = rtrim((string) ($this->option('url') ?: config('app.url')), '/');

    $article = Article::query()->whereHas('issue')->with('issue')->latest('id')->first();

    if ($article === null) {
        $this->error('No articles in the database.');

        return 1;
    }

    $summary = $article->presentSummary();
    $url = "{$base}/articles/{$summary['issueSlug']}/{$summary['number']}";
    $this->line("GET {$url}");

    $response = Http::withHeaders(['Accept' => 'text/html'])->timeout(20)->get($url);
    $html = $response->body();

    $checks = [
        'HTTP 200' => $response->status() === 200,
        'server-side rendered (SSR markup in #app)' => (bool) preg_match('/<div[^>]+id="app"[^>]*>\s*<[a-z]/i', $html),
        'citation_title meta tag' => str_contains($html, 'name="citation_title"'),
        'stylesheet linked from /build' => (bool) preg_match('#<link[^>]+href="[^"]*/build/assets/[^"]+\.css"#', $html),
        'no Vite dev server (public/hot absent)' => ! str_contains($html, '/@vite/client'),
        'developer credit (nexsollabs.com)' => str_contains($html, 'https://nexsollabs.com'),
        'X-Content-Type-Options header' => $response->header('X-Content-Type-Options') === 'nosniff',
    ];

    $failed = 0;

    foreach ($checks as $label => $ok) {
        $this->line(sprintf('  %s  %s', $ok ? '<info>ok</info>  ' : '<error>FAIL</error>', $label));
        $failed += $ok ? 0 : 1;
    }

    if ($failed > 0) {
        $this->error("{$failed} check(s) failed.");

        return 1;
    }

    $this->info('All checks passed.');

    return 0;
})->purpose('Fetch an article page over HTTP and check SSR, scholarly meta tags, assets and headers');

// Crossref: results of the deposits sent from the back-office (only when the account is set).
Schedule::command('journal:crossref-results')->everyTenMinutes()->withoutOverlapping();
