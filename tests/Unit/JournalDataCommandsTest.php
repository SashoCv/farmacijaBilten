<?php

namespace Tests\Unit;

use App\Models\Article;
use App\Models\Issue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * journal:sync-crossref and journal:repair-text on small, real-shaped data,
 * plus the presenter fields they feed.
 */
class JournalDataCommandsTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dir = sys_get_temp_dir().'/mpb-'.uniqid();
        File::ensureDirectoryExists($this->dir);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);

        parent::tearDown();
    }

    private function issue(string $slug, int $volume, string $kind = Issue::KIND_ISSUE, ?int $number = null): Issue
    {
        return Issue::create(['slug' => $slug, 'volume' => $volume, 'kind' => $kind, 'number' => $number, 'year' => $volume + 1954]);
    }

    /** @param  array<string, mixed>  $attributes */
    private function article(Issue $issue, string $number, array $attributes = []): Article
    {
        $folder = str_replace('-', '_', $issue->slug);

        return Article::create([
            'issue_id' => $issue->id,
            'number' => $number,
            'position' => (int) $number,
            'title' => "Article {$number}",
            'authors' => ['Ana Poceva'],
            'pdf' => "volumes/Volume {$folder}/{$folder}_{$number}.pdf",
            ...$attributes,
        ]);
    }

    public function test_sync_crossref_records_which_dois_resolve(): void
    {
        $i692 = $this->issue('69-2', 69, number: 2);
        $s681 = $this->issue('68-s1', 68, Issue::KIND_SUPPLEMENT, 1);
        $v58 = $this->issue('58', 58, Issue::KIND_VOLUME);
        $i712 = $this->issue('71-2', 71, number: 2);

        $doi = fn (string $s) => "10.33320/maced.pharm.bull.{$s}";

        $ok = $this->article($v58, '001', ['doi' => $doi('2012.58.001')]);
        $double = $this->article($s681, '115', ['doi' => $doi('2022.68.03.115')]);
        $typo = $this->article($s681, '010', ['doi' => $doi('2022.68.03.010')]);
        $missing = $this->article($v58, '002');
        $foreign = $this->article($v58, '003', ['doi' => '10.1371/journal.pone.0068431']);
        $wrongTarget = $this->article($i692, '001', ['doi' => $doi('2023.69.02.001')]);
        $takenPdf = $this->article($i692, '003', ['doi' => $doi('2023.69.02.003')]);
        $unregistered = $this->article($i712, '001', ['doi' => $doi('2025.71.02.001')]);

        $url = fn (string $path) => 'http://bulletin.mfd.org.mk/volumes/'.str_replace(' ', '%20', $path);
        File::put("{$this->dir}/crossref.json", (string) json_encode([
            ['DOI' => $doi('2012.58.001'), 'type' => 'journal-article', 'url' => $url('Volume 58/58_001.pdf')],
            ['DOI' => '10.33320/'.$doi('2022.68.03.115'), 'type' => 'journal-article', 'url' => $url('Volume 68_s1/68_s1_115.pdf')],
            ['DOI' => $doi('2022.68.03.010/'), 'type' => 'journal-article', 'url' => $url('Volume 68_s1/68_s1_010.pdf')],
            ['DOI' => $doi('2012.58.002'), 'type' => 'journal-article', 'url' => $url('Volume 58/58_002.pdf')],
            ['DOI' => $doi('2012.58.003'), 'type' => 'journal-article', 'url' => $url('Volume 58/58_003.pdf')],
            ['DOI' => $doi('2023.69.02.001'), 'type' => 'journal-article', 'url' => $url('Volume 69_2/69_2_003.pdf')],
            ['DOI' => $doi('2023.69.02'), 'type' => 'journal-issue', 'url' => 'https://bulletin.mfd.org.mk/volume-69-2/'],
            ['DOI' => '10.33320/'.$doi('2012.58'), 'type' => 'journal-volume', 'url' => $url('Volume 58/Volume_58.pdf')],
            ['DOI' => $doi('2022.68.03'), 'type' => 'journal-issue', 'url' => 'https://bulletin.mfd.org.mk/68-supp-1/'],
        ]));

        $run = fn () => $this->artisan('journal:sync-crossref', ['--fixture' => "{$this->dir}/crossref.json", '--reports' => $this->dir])->assertSuccessful();
        $run();

        $this->assertTrue($ok->refresh()->doi_registered);
        $this->assertSame('https://doi.org/'.$doi('2012.58.001'), $ok->doiUrl());

        // Deposited with a doubled prefix: the link uses the form that resolves.
        $this->assertTrue($double->refresh()->doi_registered);
        $this->assertSame('https://doi.org/10.33320/'.$doi('2022.68.03.115'), $double->doiUrl());
        $this->assertStringContainsString('doi: '.$doi('2022.68.03.115'), $double->citation());

        // This PDF is registered under a mistyped DOI, which still resolves here.
        $this->assertTrue($typo->refresh()->doi_registered);
        $this->assertSame($doi('2022.68.03.010/'), $typo->doi_resolvable);

        // Filled in by PDF path; a DOI from the reference list is replaced.
        $this->assertSame($doi('2012.58.002'), $missing->refresh()->doi);
        $this->assertSame($doi('2012.58.003'), $foreign->refresh()->doi);
        $this->assertTrue($foreign->doi_registered);

        // Registered, but for another paper's PDF: no link, no DOI in the citation.
        $this->assertFalse($wrongTarget->refresh()->doi_registered);
        $this->assertNull($wrongTarget->doiUrl());
        $this->assertFalse($takenPdf->refresh()->doi_registered);

        $this->assertFalse($unregistered->refresh()->doi_registered);
        $this->assertStringNotContainsString('doi:', $unregistered->citation());

        // Issue-level deposits: "…68.03" is supplement 1.
        $this->assertSame($doi('2023.69.02'), $i692->refresh()->doi);
        $this->assertSame($doi('2022.68.03'), $s681->refresh()->doi);
        $this->assertSame('10.33320/'.$doi('2012.58'), $v58->refresh()->doi);
        $this->assertNull($i712->refresh()->doi);

        $this->assertStringContainsString('2025.71.02.001', File::get("{$this->dir}/doi-unregistered.csv"));
        $this->assertCount(2, file("{$this->dir}/doi-double-prefix.csv", FILE_SKIP_EMPTY_LINES));
        $this->assertStringContainsString('registered for a different PDF', File::get("{$this->dir}/doi-mismatch.csv"));

        // Idempotent.
        $before = Article::orderBy('id')->get(['doi', 'doi_registered', 'doi_resolvable'])->toArray();
        $run();
        $this->assertSame($before, Article::orderBy('id')->get(['doi', 'doi_registered', 'doi_resolvable'])->toArray());
    }

    public function test_repair_text_fixes_encodings_history_types_and_languages(): void
    {
        $volume = $this->issue('52', 52, Issue::KIND_VOLUME);

        $old = $this->article($volume, '004', [
            'title' => 'Effects of amifostin',
            'type' => 'Review',
            'abstract' => 'Тхе интродуцтион оф цѕцлоспорине А (ЦсА) инто тхе цлиницал працтице хас ресултед ин а мајор импровемент.',
            'keywords' => ['Цѕцлоспорине А', 'ХПЛЦ'],
            'affiliations' => [
                'Institut za pretklini~ka farmakologija, Skopje, R. Makedonija',
                'Univerzitet vo Pri{tina, Kosovo Primen april 2006, prifaten juni 2006',
            ],
        ]);

        $noisy = $this->article($volume, '005', [
            'title' => 'Production of [ 18 F]NaF',
            'type' => 'Case report',
            'abstract' => 'Pneumonia was determined in ~21% of patients` records in the hospitаl.',
            'history' => 'received a topical treatment that contained Rosa',
        ]);

        $this->artisan('journal:repair-text', ['--no-pdf' => true])->assertSuccessful();

        $old->refresh();
        $this->assertStringStartsWith('The introduction of cyclosporine A (CsA)', (string) $old->abstract);
        $this->assertSame(['Cyclosporine A', 'HPLC'], $old->keywords);
        $this->assertSame(['Institut za pretklinička farmakologija, Skopje, R. Makedonija', 'Univerzitet vo Priština, Kosovo'], $old->affiliations);
        $this->assertSame('Received: April 2006; Accepted: June 2006', $old->history);
        $this->assertSame('2006-04-01', $old->received_at?->toDateString());
        $this->assertSame('Review paper', $old->type);
        $this->assertSame(['en', 'en', 'en'], [$old->title_lang, $old->abstract_lang, $old->keywords_lang]);

        // Presented at the precision printed on the paper.
        $this->assertSame('2006-04', $old->historyDate('received'));
        $this->assertSame('2006-06', $old->present()['acceptedAt']);

        $noisy->refresh();
        $this->assertSame('Production of [18F]NaF', $noisy->title);
        $this->assertSame('Production of [<sup>18</sup>F]NaF', $noisy->title_html);
        $this->assertSame('Production of [<sup>18</sup>F]NaF', $noisy->presentSummary()['titleHtml']);
        $this->assertSame('Pneumonia was determined in ∼21% of patients’ records in the hospital.', $noisy->abstract);
        $this->assertNull($noisy->history);
        $this->assertSame('Case study', $noisy->type);

        // A second run changes nothing, and the data passes verification.
        $this->artisan('journal:repair-text', ['--no-pdf' => true])->expectsOutputToContain('repair')->assertSuccessful();
        $this->assertFalse(Article::find($old->id)->isDirty());
        $this->assertSame($old->only(['abstract', 'affiliations', 'history', 'type']), Article::find($old->id)->only(['abstract', 'affiliations', 'history', 'type']));
    }

    public function test_issue_released_as_a_whole_shows_its_own_date(): void
    {
        $issue = $this->issue('62-2', 62, number: 2);
        $issue->update(['online_at' => '2017-11-03', 'cover_pdf' => 'volumes/Volume 62_2/62_2_cover.pdf']);
        $this->article($issue, '003');

        $presented = Issue::withArticleStats()->find($issue->id)->present();

        $this->assertSame('3 November 2017', $presented['publishedRange']);
        $this->assertSame('2017-11-03', $presented['onlineAt']);
        $this->assertSame('/volumes/Volume%2062_2/62_2_cover.pdf', $presented['coverPdf']);
        // The article itself has no online date: its publication date is the volume year.
        $this->assertSame('2016', Article::first()->publicationDate());
    }
}
