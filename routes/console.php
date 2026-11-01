<?php

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
    $name = $this->option('name') ?: $this->ask('Full name');
    $password = $this->secret('Password (at least 12 characters)');

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password],
        ['email' => ['required', 'email'], 'name' => ['required', 'string', 'max:255'], 'password' => ['required', 'string', 'min:12']],
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $user = User::where('email', strtolower($email))->first() ?? new User;
    $created = ! $user->exists;

    $user->forceFill([
        'email' => strtolower($email),
        'name' => $name,
        'password' => $password,
        'email_verified_at' => $user->email_verified_at ?? now(),
    ])->save();

    $this->info(($created ? 'Created' : 'Updated')." editor account {$user->email}. Sign in at ".url('/login'));

    return 0;
})->purpose('Create or update an editorial-office account (public registration is off)');

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
