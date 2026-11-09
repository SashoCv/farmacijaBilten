<?php

namespace Tests\Feature;

use App\Crossref\Crossref;
use App\Enums\ManuscriptStatus;
use App\Manuscripts\Rendering\PdfRenderer;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use App\Models\Issue;
use App\Models\Manuscript;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\Manuscripts\ArticlePublished;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

/**
 * Publishing: open an issue, place accepted manuscripts in it, publish them
 * online with the final PDF (they become articles on the site, under Early
 * online), and close the issue.
 */
class PublishingTest extends TestCase
{
    use RefreshDatabase;

    private function doc(string $text): array
    {
        return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]]];
    }

    private function accepted(User $author, string $reference = 'MPB-2026-0007', ?string $doi = '10.33320/maced.pharm.bull.2026.73.01.001'): Manuscript
    {
        $m = new Manuscript(['submitter_id' => $author->id, 'type' => 'original_scientific_paper', 'language' => 'en']);
        $m->forceFill([
            'status' => ManuscriptStatus::Accepted,
            'reference' => $reference,
            'title' => 'Sugars in juices',
            'received_at' => now()->subMonths(3),
            'accepted_at' => now()->subWeek(),
            'doi' => $doi,
            'first_page' => 3,
            'last_page' => 11,
        ])->save();

        $m->versions()->create([
            'number' => 1, 'round' => 1, 'kind' => 'submission', 'content_hash' => str_repeat('a', 64),
            'content' => [
                'title' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
                    ['type' => 'text', 'text' => 'Sugars in '],
                    ['type' => 'text', 'text' => 'juices', 'marks' => [['type' => 'italic']]],
                ]]]],
                'abstract' => $this->doc('We measured sugars.'),
                'keywords' => ['sugars', 'HPLC', 'juices'],
                'authors' => [['id' => 'a', 'givenName' => 'Ana', 'familyName' => 'Avtorska', 'givenNameAlt' => '', 'familyNameAlt' => '', 'email' => 'a@example.org', 'orcid' => '', 'phone' => '', 'affiliations' => ['f'], 'corresponding' => true]],
                'affiliations' => [['id' => 'f', 'text' => 'Faculty of Pharmacy, Skopje', 'textAlt' => '']],
                'sections' => [],
                'references' => $this->doc('Ref, A., 2020. Title. J. 1, 1.'),
            ],
        ]);

        return $m;
    }

    public function test_from_accepted_manuscript_to_a_closed_issue(): void
    {
        Storage::fake('journal');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $author = User::factory()->author()->create();
        $m = $this->accepted($author);

        // Open an issue.
        $this->actingAs($admin)->post('/admin/issues', ['volume' => 73, 'kind' => 'issue', 'number' => 1, 'year' => 2027])
            ->assertRedirect('/admin/issues/73-1');
        $issue = Issue::where('slug', '73-1')->sole();
        $this->assertFalse((bool) $issue->is_published);
        $this->actingAs($admin)->post('/admin/issues', ['volume' => 73, 'kind' => 'issue', 'number' => 1, 'year' => 2027])->assertSessionHasErrors('number');

        // Place the manuscript.
        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/issue", ['issue' => '73-1'])->assertSessionHasNoErrors();
        $m->refresh();
        $this->assertSame($issue->id, $m->issue_id);
        $this->assertSame(73, $m->volume);
        $this->assertSame('1', $m->issue);

        // The issue cannot close while it waits for this manuscript.
        $this->actingAs($admin)->post('/admin/issues/73-1/close')->assertSessionHasErrors('issue');

        $this->actingAs($admin)->get('/admin/issues/73-1')->assertInertia(fn (Assert $page) => $page
            ->component('admin/issues/show')
            ->where('manuscripts.0.id', $m->public_id)
            ->whereNot('manuscripts.0.publishUrl', null)
        );

        // Publish online with the final PDF.
        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/publish", [
            'pdf' => UploadedFile::fake()->create('final.pdf', 300, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $article = Article::sole();
        $this->assertSame('001', $article->number);
        $this->assertSame('Sugars in juices', $article->title);
        $this->assertSame('Sugars in <em>juices</em>', $article->title_html);
        $this->assertSame(['Ana Avtorska'], $article->authors);
        $this->assertSame('3–11', $article->pages);
        $this->assertSame('10.33320/maced.pharm.bull.2026.73.01.001', $article->doi);
        $this->assertSame('We measured sugars.', $article->abstract);
        $this->assertSame('Original scientific paper', $article->type);
        $this->assertSame('volumes/Volume 73_1/73_1_001.pdf', $article->pdf);
        Storage::disk('journal')->assertExists('volumes/Volume 73_1/73_1_001.pdf');

        $m->refresh();
        $this->assertSame(ManuscriptStatus::Published, $m->status);
        $this->assertSame($article->id, $m->article_id);
        Notification::assertSentTo($author, ArticlePublished::class);

        // On the site, under Early online, before the issue closes.
        $this->get('/articles/73-1/001')->assertOk();

        // Close the issue: it is published.
        $this->actingAs($admin)->post('/admin/issues/73-1/close')->assertSessionHasNoErrors();
        $this->assertTrue((bool) $issue->fresh()->is_published);

        // Closed: no more manuscripts can be placed in it.
        $other = $this->accepted($author, 'MPB-2026-0008', null);
        $this->actingAs($admin)->post("/admin/manuscripts/{$other->public_id}/issue", ['issue' => '73-1'])->assertSessionHasErrors('issue');

        $this->actingAs($author)->post('/admin/issues', ['volume' => 74, 'kind' => 'issue', 'number' => 1, 'year' => 2028])->assertForbidden();
    }

    /** A renderer that writes a small fake PDF of the given number of pages (WeasyPrint is not in CI). */
    private function fakeRenderer(int $pages = 5, bool $fails = false): object
    {
        $fake = new class extends PdfRenderer
        {
            public int $fakePages = 5;

            public bool $fails = false;

            /** @var list<array{first: int|null, last: int|null, anonymous: bool}> */
            public array $calls = [];

            public function render(Manuscript $m, array $content, bool $anonymous = false): string
            {
                $this->calls[] = ['first' => $m->first_page, 'last' => $m->last_page, 'anonymous' => $anonymous];

                if ($this->fails) {
                    throw new RuntimeException('weasyprint: not found');
                }

                $this->pages = $this->fakePages;
                $path = (string) tempnam(sys_get_temp_dir(), 'mpb-test-');
                file_put_contents($path, "%PDF-1.7\n% fake {$m->first_page}-{$m->last_page}\n%%EOF");

                return $path;
            }
        };
        $fake->fakePages = $pages;
        $fake->fails = $fails;
        $this->app->instance(PdfRenderer::class, $fake);

        return $fake;
    }

    public function test_publishing_without_a_file_makes_the_pdf_and_sets_the_pages(): void
    {
        Storage::fake('journal');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $author = User::factory()->author()->create();
        $issue = Issue::create(['slug' => '73-1', 'volume' => 73, 'kind' => 'issue', 'number' => 1, 'year' => 2027, 'is_published' => false]);

        // An article from earlier in the issue ends on page 11.
        Article::create(['issue_id' => $issue->id, 'number' => '001', 'position' => 1, 'title' => 'Earlier', 'authors' => ['A. B.'], 'pages' => '1–11', 'pdf' => 'x.pdf']);

        $m = $this->accepted($author, 'MPB-2026-0009', '10.33320/maced.pharm.bull.2027.73.01.002');
        $m->forceFill(['first_page' => null, 'last_page' => null])->save();
        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/issue", ['issue' => '73-1'])->assertSessionHasNoErrors();

        $fake = $this->fakeRenderer(pages: 4);

        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/publish")->assertSessionHasNoErrors();

        // Starts after the earlier article; rendered again once the last page was known.
        $this->assertSame([
            ['first' => 12, 'last' => null, 'anonymous' => false],
            ['first' => 12, 'last' => 15, 'anonymous' => false],
        ], $fake->calls);

        $article = Article::where('number', '002')->sole();
        $this->assertSame('12–15', $article->pages);
        $this->assertSame(4, $article->pdf_pages);
        $this->assertSame('volumes/Volume 73_1/73_1_002.pdf', $article->pdf);
        $this->assertStringContainsString('fake 12-15', Storage::disk('journal')->get($article->pdf));

        $m->refresh();
        $this->assertSame(ManuscriptStatus::Published, $m->status);
        $this->assertSame([12, 15], [$m->first_page, $m->last_page]);
        $this->assertSame('generated', $m->events()->where('type', 'published')->sole()->payload['pdf']);
        Notification::assertSentTo($author, ArticlePublished::class);
    }

    public function test_when_the_pdf_cannot_be_made_nothing_is_published(): void
    {
        Storage::fake('journal');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $author = User::factory()->author()->create();
        Issue::create(['slug' => '73-1', 'volume' => 73, 'kind' => 'issue', 'number' => 1, 'year' => 2027, 'is_published' => false]);
        $m = $this->accepted($author);
        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/issue", ['issue' => '73-1']);

        $this->fakeRenderer(fails: true);

        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/publish")->assertSessionHasErrors('pdf');

        $this->assertSame(0, Article::count());
        $this->assertSame(ManuscriptStatus::Accepted, $m->fresh()->status);
        Notification::assertNothingSent();
    }

    public function test_the_pdf_preview_is_for_those_who_may_see_the_manuscript(): void
    {
        $admin = User::factory()->admin()->create();
        $author = User::factory()->author()->create();
        $stranger = User::factory()->author()->create();
        $m = $this->accepted($author);
        $fake = $this->fakeRenderer();

        $this->actingAs($admin)->get("/manuscripts/{$m->public_id}/pdf")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->actingAs($author)->get("/manuscripts/{$m->public_id}/pdf")->assertOk();
        $this->actingAs($stranger)->get("/manuscripts/{$m->public_id}/pdf")->assertForbidden();

        $this->assertCount(2, $fake->calls);
        // A preview changes nothing.
        $this->assertSame([3, 11], [$m->fresh()->first_page, $m->fresh()->last_page]);
    }

    public function test_publishing_registers_the_doi_when_automatic_deposits_are_on(): void
    {
        Storage::fake('journal');
        Notification::fake();
        Http::fake(['test.crossref.org/*' => Http::response('<h2>SUCCESS</h2>')]);
        config(['crossref.username' => 'mfd/bulletin', 'crossref.password' => 'secret', 'crossref.mode' => 'test']);
        Setting::put(Crossref::SETTING_NAME, 'Editorial office');
        Setting::put(Crossref::SETTING_EMAIL, 'bulletin@example.org');
        Setting::put(Crossref::SETTING_AUTO, '1');

        $admin = User::factory()->admin()->create();
        $author = User::factory()->author()->create();
        Issue::create(['slug' => '73-1', 'volume' => 73, 'kind' => 'issue', 'number' => 1, 'year' => 2027, 'is_published' => false]);
        $m = $this->accepted($author);
        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/issue", ['issue' => '73-1']);
        $this->fakeRenderer(pages: 9);

        $this->actingAs($admin)->post("/admin/manuscripts/{$m->public_id}/publish")->assertSessionHasNoErrors();

        $deposit = CrossrefDeposit::sole();
        $this->assertSame('publish', $deposit->trigger);
        $this->assertSame('sent', $deposit->status);
        $this->assertSame(['10.33320/maced.pharm.bull.2026.73.01.001'], $deposit->dois);

        // The manuscript's authors with their affiliation go to Crossref.
        Http::assertSent(fn ($request) => str_contains($request->body(), '<institution_name>Faculty of Pharmacy, Skopje</institution_name>')
            && str_contains($request->body(), '<first_page>3</first_page>'));
    }
}
