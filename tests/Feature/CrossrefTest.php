<?php

namespace Tests\Feature;

use App\Crossref\Crossref;
use App\Crossref\DepositXml;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use App\Models\Issue;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * DOI registration at Crossref: the deposit file (valid against the official
 * 5.3.1 schema), downloading it, sending it, reading the result.
 */
class CrossrefTest extends TestCase
{
    use RefreshDatabase;

    private Issue $issue;

    protected function setUp(): void
    {
        parent::setUp();

        $this->issue = Issue::create(['slug' => '72-s1', 'volume' => 72, 'kind' => Issue::KIND_SUPPLEMENT, 'number' => 1, 'year' => 2026, 'is_published' => true]);

        Article::create([
            'issue_id' => $this->issue->id, 'number' => '001', 'position' => 1,
            'title' => 'Effect of Aronia & co on [18F]NaF', 'title_html' => 'Effect of <i>Aronia</i> &amp; co on [<sup>18</sup>F]NaF<span>!</span>',
            'title_lang' => 'en',
            'authors' => ['Tatjana Kadifkova Panovska', 'Ana Avtorska'],
            'pages' => '101–102', 'online_at' => '2026-10-01',
            'abstract' => "First paragraph.\n\nSecond < paragraph.",
            'references' => "Ref, A., 2020. One.\nRef, B., 2021. Two.",
            'doi' => '10.33320/maced.pharm.bull.2026.72.03.001', 'doi_registered' => false,
            'pdf' => 'volumes/Volume 72_3/72_3_001.pdf',
        ]);
        Article::create([
            'issue_id' => $this->issue->id, 'number' => '002', 'position' => 2,
            'title' => 'Already registered', 'authors' => ['B. C.'],
            'doi' => '10.33320/maced.pharm.bull.2026.72.03.002', 'doi_registered' => true,
            'pdf' => 'volumes/Volume 72_3/72_3_002.pdf',
        ]);
        Article::create([
            'issue_id' => $this->issue->id, 'number' => '003', 'position' => 3,
            'title' => 'A cited DOI', 'authors' => ['B. C.'],
            'doi' => '10.1371/journal.pone.0068431', 'doi_registered' => false,
            'pdf' => 'volumes/Volume 72_3/72_3_003.pdf',
        ]);
    }

    private function depositor(): void
    {
        Setting::put(Crossref::SETTING_NAME, 'Editorial office');
        Setting::put(Crossref::SETTING_EMAIL, 'bulletin@example.org');
    }

    public function test_the_deposit_file_is_valid_and_carries_the_metadata(): void
    {
        $xml = (new DepositXml('Editorial office', 'bulletin@example.org'))
            ->build($this->issue, Crossref::pending($this->issue), 'mpb-test-1');

        $this->assertSame([], Crossref::validate($xml));

        // Only the journal's DOI not registered yet.
        $this->assertStringContainsString('<doi>10.33320/maced.pharm.bull.2026.72.03.001</doi>', $xml);
        $this->assertStringNotContainsString('72.03.002', $xml);
        $this->assertStringNotContainsString('pone.0068431', $xml);

        // Journal and issue as deposited before; the supplement is issue "03", as in its DOIs.
        $this->assertStringContainsString('<abbrev_title>Maced. Pharm. Bull.</abbrev_title>', $xml);
        $this->assertStringContainsString('<issn media_type="print">1409-8695</issn>', $xml);
        $this->assertStringContainsString('<issn media_type="electronic">1857-8969</issn>', $xml);
        $this->assertStringContainsString('<issue>03</issue>', $xml);
        $this->assertStringContainsString('<registrant>Macedonian Pharmaceutical Association</registrant>', $xml);

        // Face markup kept, other tags dropped, text escaped.
        $this->assertStringContainsString('<title>Effect of <i>Aronia</i> &amp; co on [<sup>18</sup>F]NaF!</title>', $xml);
        // First word: given name; the rest: family name.
        $this->assertMatchesRegularExpression('#<given_name>Tatjana</given_name>\s*<surname>Kadifkova Panovska</surname>#', $xml);
        $this->assertStringContainsString('<jats:p>Second &lt; paragraph.</jats:p>', $xml);
        $this->assertStringContainsString('<first_page>101</first_page>', $xml);
        $this->assertStringContainsString('<last_page>102</last_page>', $xml);
        // The DOI leads to the PDF (as before), which also goes to Similarity Check.
        $this->assertStringContainsString('<resource>https://bulletin.mfd.org.mk/volumes/Volume%2072_3/72_3_001.pdf</resource>', $xml);
        $this->assertStringNotContainsString('localhost', $xml);
        $this->assertStringContainsString('<item crawler="iParadigms">', $xml);
        $this->assertStringContainsString('<unstructured_citation>Ref, B., 2021. Two.</unstructured_citation>', $xml);

        config(['crossref.target' => 'page']);
        $xml = (new DepositXml('Editorial office', 'bulletin@example.org'))->build($this->issue, Crossref::pending($this->issue), 'mpb-test-2');
        $this->assertStringContainsString('<resource>https://bulletin.mfd.org.mk/articles/72-s1/001</resource>', $xml);
        $this->assertSame([], Crossref::validate($xml));
    }

    public function test_the_schema_check_catches_a_broken_file(): void
    {
        $this->assertNotSame([], Crossref::validate('<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1"><head/></doi_batch>'));
        $this->assertNotSame([], Crossref::validate('not xml'));
    }

    public function test_the_office_downloads_the_file_after_setting_the_depositor(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->from('/admin/archive-dois')->get('/admin/crossref/issues/72-s1/xml')
            ->assertRedirect('/admin/archive-dois')
            ->assertSessionHasErrors('crossref');

        $this->actingAs($admin)->put('/admin/crossref/settings', [
            'depositor_name' => 'Editorial office', 'depositor_email' => 'bulletin@example.org', 'auto' => '0',
        ])->assertSessionHasNoErrors();

        $response = $this->actingAs($admin)->get('/admin/crossref/issues/72-s1/xml')->assertOk();
        $this->assertStringContainsString('attachment; filename="crossref-72-s1.xml"', (string) $response->headers->get('Content-Disposition'));
        $this->assertSame([], Crossref::validate($response->getContent()));

        $this->actingAs($admin)->get('/admin/archive-dois')->assertInertia(fn (Assert $page) => $page
            ->where('crossref.depositorEmail', 'bulletin@example.org')
            ->where('crossref.connected', false)
            ->where('groups.0.pending', 1)
        );

        // Without the account on the server nothing can be sent.
        $this->actingAs($admin)->post('/admin/crossref/issues/72-s1/deposit')->assertSessionHasErrors('crossref');

        $author = User::factory()->author()->create();
        $this->actingAs($author)->get('/admin/crossref/issues/72-s1/xml')->assertForbidden();
        $this->actingAs($author)->put('/admin/crossref/settings', ['depositor_name' => 'x', 'depositor_email' => 'x@example.org'])->assertForbidden();
    }

    public function test_a_deposit_is_sent_and_its_result_read(): void
    {
        config(['crossref.username' => 'mfd/bulletin', 'crossref.password' => 'secret', 'crossref.mode' => 'live']);
        $this->depositor();

        Http::fake([
            'doi.crossref.org/servlet/deposit' => Http::response('<html><h2>SUCCESS</h2><p>Your batch submission was successfully received.</p></html>'),
            'doi.crossref.org/servlet/submissionDownload' => Http::response('<?xml version="1.0"?><doi_batch_diagnostic status="completed"><record_diagnostic status="Success"><doi>10.33320/maced.pharm.bull.2026.72.03.001</doi><msg>Successfully added</msg></record_diagnostic></doi_batch_diagnostic>'),
        ]);

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->post('/admin/crossref/issues/72-s1/deposit')->assertSessionHasNoErrors();

        $deposit = CrossrefDeposit::sole();
        $this->assertSame('sent', $deposit->status);
        $this->assertSame(['10.33320/maced.pharm.bull.2026.72.03.001'], $deposit->dois);
        $this->assertFalse($deposit->test);

        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://doi.crossref.org/servlet/deposit'
                && str_contains($request->body(), 'doMDUpload')
                && str_contains($request->body(), '<doi>10.33320/maced.pharm.bull.2026.72.03.001</doi>');
        });

        $this->artisan('journal:crossref-results')->assertSuccessful();

        $this->assertSame('succeeded', $deposit->fresh()->status);
        $this->assertTrue(Article::where('number', '001')->sole()->doi_registered);
        $this->assertSame([], Crossref::pending($this->issue)->all());
    }

    public function test_a_failed_record_is_reported(): void
    {
        config(['crossref.username' => 'mfd/bulletin', 'crossref.password' => 'secret', 'crossref.mode' => 'test']);
        $this->depositor();

        Http::fake([
            'test.crossref.org/servlet/deposit' => Http::response('<h2>SUCCESS</h2>'),
            'test.crossref.org/servlet/submissionDownload' => Http::response('<doi_batch_diagnostic status="completed"><record_diagnostic status="Failure"><doi>10.33320/maced.pharm.bull.2026.72.03.001</doi><msg>Record not processed because submitted version: 1 is less or equal to previously submitted version</msg></record_diagnostic></doi_batch_diagnostic>'),
        ]);

        $deposit = Crossref::deposit($this->issue, Crossref::pending($this->issue), 'button', null);
        $this->artisan('journal:crossref-results')->assertSuccessful();

        $deposit->refresh();
        $this->assertSame('failed', $deposit->status);
        $this->assertTrue($deposit->test);
        $this->assertStringContainsString('less or equal to previously submitted version', (string) $deposit->message);
        $this->assertFalse(Article::where('number', '001')->sole()->doi_registered);
    }

    public function test_a_wrong_login_marks_the_deposit_failed(): void
    {
        config(['crossref.username' => 'mfd/bulletin', 'crossref.password' => 'wrong']);
        $this->depositor();
        Http::fake(['*' => Http::response('Unauthorized', 401)]);

        $deposit = Crossref::deposit($this->issue, Crossref::pending($this->issue), 'button', null);

        $this->assertSame('failed', $deposit->fresh()->status);
        $this->assertStringContainsString('Unauthorized', (string) $deposit->fresh()->message);
    }

    public function test_a_doi_registered_only_with_a_doubled_prefix_is_deposited_as_printed(): void
    {
        $article = Article::where('number', '002')->sole();
        $article->forceFill(['doi_resolvable' => '10.33320/10.33320/maced.pharm.bull.2026.72.03.002'])->save();

        $pending = Crossref::pending($this->issue);
        $this->assertSame(['001', '002'], $pending->pluck('number')->all());

        $xml = (new DepositXml('Editorial office', 'bulletin@example.org'))->build($this->issue, $pending, 'mpb-test-3');
        $this->assertSame([], Crossref::validate($xml));
        $this->assertStringContainsString('<doi>10.33320/maced.pharm.bull.2026.72.03.002</doi>', $xml);
        $this->assertStringNotContainsString('10.33320/10.33320', $xml);

        $this->actingAs(User::factory()->admin()->create())->get('/admin/archive-dois')->assertInertia(fn (Assert $page) => $page
            ->where('double.0.slug', '72-s1')
            ->where('double.0.pending', 2)
            ->where('double.0.articles.0.registeredAs', '10.33320/10.33320/maced.pharm.bull.2026.72.03.002')
        );
    }

    public function test_the_office_enters_the_crossref_account_in_the_panel(): void
    {
        $this->depositor();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->put('/admin/crossref/account', ['username' => 'mfd/bulletin', 'password' => '', 'mode' => 'test'])
            ->assertSessionHasErrors('password');

        $this->actingAs($admin)->put('/admin/crossref/account', ['username' => 'mfd/bulletin', 'password' => 'S3cret!pass', 'mode' => 'test'])
            ->assertSessionHasNoErrors();

        // Stored encrypted, never sent to the browser.
        $stored = (string) DB::table('settings')->where('key', Crossref::SETTING_PASSWORD)->value('value');
        $this->assertStringNotContainsString('S3cret', $stored);
        $this->assertSame('S3cret!pass', Crossref::password());
        $this->assertTrue(Crossref::connected());
        $this->assertTrue(Crossref::testMode());

        $page = $this->actingAs($admin)->get('/admin/archive-dois');
        $page->assertInertia(fn (Assert $p) => $p
            ->where('crossref.connected', true)
            ->where('crossref.accountSource', 'panel')
            ->where('crossref.username', 'mfd/bulletin')
        );
        $this->assertStringNotContainsString('S3cret', $page->getContent());

        // An empty password keeps the saved one; the mode changes.
        $this->actingAs($admin)->put('/admin/crossref/account', ['username' => 'mfd/bulletin', 'password' => '', 'mode' => 'live'])
            ->assertSessionHasNoErrors();
        $this->assertSame('S3cret!pass', Crossref::password());
        $this->assertFalse(Crossref::testMode());

        // Deposits use it.
        Http::fake(['doi.crossref.org/*' => Http::response('<h2>SUCCESS</h2>')]);
        $this->actingAs($admin)->post('/admin/crossref/issues/72-s1/deposit')->assertSessionHasNoErrors();
        Http::assertSent(fn (Request $r) => str_contains($r->body(), 'mfd/bulletin') && str_contains($r->body(), 'S3cret!pass'));

        // Removed.
        $this->actingAs($admin)->put('/admin/crossref/account', ['forget' => true, 'mode' => 'live'])->assertSessionHasNoErrors();
        $this->assertFalse(Crossref::connected());

        $author = User::factory()->author()->create();
        $this->actingAs($author)->put('/admin/crossref/account', ['username' => 'x', 'password' => 'y', 'mode' => 'live'])->assertForbidden();
    }
}
