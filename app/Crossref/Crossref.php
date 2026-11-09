<?php

namespace App\Crossref;

use App\Jobs\SendCrossrefDeposit;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use App\Models\Issue;
use App\Models\Setting;
use App\Models\User;
use DOMDocument;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SimpleXMLElement;

/**
 * DOI registration at Crossref: which articles of an issue still need a
 * deposit, the deposit file (DepositXml, checked against the official
 * schema), sending it with the journal's Crossref account and reading the
 * result back.
 */
final class Crossref
{
    public const SETTING_NAME = 'crossref.depositor_name';

    public const SETTING_EMAIL = 'crossref.depositor_email';

    public const SETTING_AUTO = 'crossref.auto';

    public const SETTING_USERNAME = 'crossref.username';

    /** Stored encrypted (APP_KEY); never sent back to the browser. */
    public const SETTING_PASSWORD = 'crossref.password';

    public const SETTING_MODE = 'crossref.mode';

    /** The Crossref account: entered in the back-office, or in .env. */
    public static function username(): ?string
    {
        return Setting::get(self::SETTING_USERNAME) ?: config('crossref.username');
    }

    public static function password(): ?string
    {
        $stored = Setting::get(self::SETTING_PASSWORD);

        if (filled($stored)) {
            try {
                return Crypt::decryptString((string) $stored);
            } catch (DecryptException) {
                return null; // APP_KEY changed: the password must be entered again.
            }
        }

        return config('crossref.password');
    }

    /** Where the account comes from: "panel", "env" or null. */
    public static function accountSource(): ?string
    {
        if (filled(Setting::get(self::SETTING_USERNAME)) && filled(Setting::get(self::SETTING_PASSWORD))) {
            return 'panel';
        }

        return filled(config('crossref.username')) && filled(config('crossref.password')) ? 'env' : null;
    }

    /** The account is set in .env: deposits can be sent from the system. */
    public static function connected(): bool
    {
        return filled(self::username()) && filled(self::password());
    }

    public static function testMode(): bool
    {
        return (Setting::get(self::SETTING_MODE) ?: config('crossref.mode')) !== 'live';
    }

    /** Deposit each article when it is published online. */
    public static function automatic(): bool
    {
        return self::connected() && Setting::get(self::SETTING_AUTO) === '1' && self::depositorSet();
    }

    public static function depositorSet(): bool
    {
        return filled(Setting::get(self::SETTING_NAME)) && filter_var(Setting::get(self::SETTING_EMAIL), FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Problems found by journal:sync-crossref other than "not deposited",
     * keyed "issue/number" (storage/app/reports/doi-mismatch.csv).
     *
     * @return array<string, array{problem: string, crossrefDoi: string}>
     */
    public static function problems(): array
    {
        $reasons = [];
        $report = storage_path('app/reports/doi-mismatch.csv');

        if (is_file($report) && ($handle = fopen($report, 'r'))) {
            fgetcsv($handle, escape: '');

            while (($line = fgetcsv($handle, escape: '')) !== false) {
                if (count($line) >= 7) {
                    $reasons[$line[0].'/'.$line[1]] = ['problem' => (string) $line[6], 'crossrefDoi' => (string) $line[4]];
                }
            }

            fclose($handle);
        }

        return $reasons;
    }

    /**
     * Articles of the issue to deposit: the journal's DOIs not registered
     * yet, and those registered only in a mistyped form (the prefix written
     * twice, "10.33320/10.33320/…"): depositing registers the DOI as printed.
     * Left out: a DOI registered for another PDF, which needs checking by
     * hand (depositing would move it).
     *
     * @return Collection<int, Article>
     */
    public static function pending(Issue $issue): Collection
    {
        $problems = self::problems();

        return $issue->articles()->orderBy('position')->get()
            ->filter(fn (Article $a) => DepositXml::isOurs($a->doi)
                && ($a->doi_registered !== true || self::mistyped($a))
                && ! self::needsCheck($problems[$issue->slug.'/'.$a->number]['problem'] ?? null))
            ->values();
    }

    /** Registered, but only in another (mistyped) form than the printed DOI. */
    public static function mistyped(Article $a): bool
    {
        return $a->doi_registered === true && filled($a->doi_resolvable) && strcasecmp((string) $a->doi_resolvable, (string) $a->doi) !== 0;
    }

    /** A DOI and a PDF crossed at Crossref: an editor must decide which is right. */
    public static function needsCheck(?string $problem): bool
    {
        return $problem !== null && ! str_contains($problem, 'mistyped') && ! str_contains($problem, 'cited DOI');
    }

    /**
     * The deposit file, checked against the schema.
     *
     * @param  Collection<int, Article>  $articles
     */
    public static function xml(Issue $issue, Collection $articles, string $batchId): string
    {
        if (! self::depositorSet()) {
            throw ValidationException::withMessages(['crossref' => __('Enter the depositor’s name and e-mail in the Crossref settings first.')]);
        }

        if ($articles->isEmpty()) {
            throw ValidationException::withMessages(['crossref' => __('Every DOI in this issue is already registered.')]);
        }

        $xml = (new DepositXml((string) Setting::get(self::SETTING_NAME), (string) Setting::get(self::SETTING_EMAIL)))
            ->build($issue, $articles, $batchId);

        $errors = self::validate($xml);

        if ($errors !== []) {
            throw ValidationException::withMessages(['crossref' => __('The deposit file does not match the Crossref schema: :errors', ['errors' => implode('; ', array_slice($errors, 0, 3))])]);
        }

        return $xml;
    }

    public static function batchId(Issue $issue): string
    {
        return 'mpb-'.$issue->slug.'-'.strtolower((string) Str::ulid());
    }

    /**
     * Errors against the Crossref 5.3.1 schema (empty when valid).
     *
     * @return list<string>
     */
    public static function validate(string $xml): array
    {
        $previous = libxml_use_internal_errors(true);
        libxml_clear_errors();

        $doc = new DOMDocument;
        $ok = $doc->loadXML($xml, LIBXML_NONET) && $doc->schemaValidate(resource_path('crossref/schema/crossref5.3.1.xsd'), LIBXML_NONET);

        $errors = array_map(fn ($e) => trim($e->message).' (line '.$e->line.')', libxml_get_errors());
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $ok ? [] : ($errors ?: ['Invalid XML']);
    }

    /**
     * Queue a deposit of the articles (sent by SendCrossrefDeposit).
     *
     * @param  Collection<int, Article>  $articles
     */
    public static function deposit(Issue $issue, Collection $articles, string $trigger, ?User $user): CrossrefDeposit
    {
        if (! self::connected()) {
            throw ValidationException::withMessages(['crossref' => __('The Crossref account is not set up on the server: download the XML and upload it at Crossref.')]);
        }

        $batchId = self::batchId($issue);
        // Build once now so that problems show at once, not later in the queue.
        self::xml($issue, $articles, $batchId);

        $deposit = CrossrefDeposit::create([
            'batch_id' => $batchId,
            'issue_id' => $issue->id,
            'user_id' => $user?->id,
            'dois' => $articles->pluck('doi')->values()->all(),
            'status' => 'queued',
            'trigger' => $trigger,
            'test' => self::testMode(),
        ]);

        SendCrossrefDeposit::dispatch($deposit->id, array_values($articles->map(fn (Article $a) => $a->id)->all()));

        return $deposit;
    }

    /** POST the file to Crossref (it is processed in Crossref's queue, within minutes). */
    public static function send(CrossrefDeposit $deposit, string $xml): void
    {
        $response = Http::timeout(120)
            ->attach('fname', $xml, $deposit->batch_id.'.xml', ['Content-Type' => 'application/xml'])
            ->post(self::endpoint().'/servlet/deposit', [
                'operation' => 'doMDUpload',
                'login_id' => (string) self::username(),
                'login_passwd' => (string) self::password(),
            ]);

        $body = trim(strip_tags($response->body()));
        // Crossref answers "SUCCESS … Your batch submission was successfully received."
        $accepted = $response->successful() && stripos($body, 'SUCCESS') !== false;

        $deposit->forceFill([
            'status' => $accepted ? 'sent' : 'failed',
            'message' => $accepted ? null : Str::limit($body ?: 'HTTP '.$response->status(), 500),
            'sent_at' => now(),
        ])->save();
    }

    /**
     * Read Crossref's result for a sent deposit. Registered DOIs are marked
     * on the articles (live deposits only).
     */
    public static function check(CrossrefDeposit $deposit): void
    {
        $response = Http::timeout(60)->asForm()->post(self::endpoint().'/servlet/submissionDownload', [
            'usr' => (string) self::username(),
            'pwd' => (string) self::password(),
            'doi_batch_id' => $deposit->batch_id,
            'type' => 'result',
        ]);

        $deposit->checked_at = now();

        $xml = $response->successful() ? @simplexml_load_string($response->body(), SimpleXMLElement::class, LIBXML_NONET) : false;

        if ($xml === false || (string) $xml['status'] !== 'completed') {
            // Still in Crossref's queue (or not readable yet): try again later.
            $deposit->save();

            return;
        }

        $ok = [];
        $failed = [];

        foreach ($xml->record_diagnostic as $record) {
            if (strcasecmp((string) $record['status'], 'Success') === 0 || strcasecmp((string) $record['status'], 'Warning') === 0) {
                $ok[] = (string) $record->doi;
            } else {
                $failed[] = trim((string) $record->doi.': '.(string) $record->msg);
            }
        }

        $deposit->forceFill([
            'status' => $failed === [] ? 'succeeded' : ($ok === [] ? 'failed' : 'partly'),
            'message' => $failed === [] ? null : Str::limit(implode("\n", $failed), 2000),
        ])->save();

        if (! $deposit->test && $ok !== []) {
            Article::whereIn('doi', $ok)->update(['doi_registered' => true, 'doi_resolvable' => DB::raw('doi')]);
        }
    }

    private static function endpoint(): string
    {
        return (string) config('crossref.endpoints.'.(self::testMode() ? 'test' : 'live'));
    }
}
