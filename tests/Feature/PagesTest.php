<?php

namespace Tests\Feature;

use App\Console\Commands\RepairPages;
use App\Journal\Import\HtmlSanitizer;
use App\Models\BoardMember;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Editorial and information pages (WS6): the sanitizer's structure repair,
 * journal:repair-pages on the cached WordPress source, the editorial board,
 * and the structured About / Indexing / Contact / Privacy / Accessibility pages.
 */
class PagesTest extends TestCase
{
    use RefreshDatabase;

    private const FIXTURE = __DIR__.'/../fixtures/wordpress-pages.json';

    /** The in-page anchors of the two author guides on the old site (9 + 3). */
    private const ANCHORS = [
        'guidelines/instructions-for-authors' => ['types_paper', 'language', 'sub_declare', 'policy_ethics', 'submission', 'referees', 'prep_manuscripts', 'after_accept', 'copy_notice'],
        'guidelines/editorial-policies' => ['auth_duty', 'edit_duty', 'rev_duty'],
    ];

    private function repair(): void
    {
        $this->artisan('journal:repair-pages', ['--source' => self::FIXTURE])
            ->expectsOutputToContain('Every in-page link resolves.')
            ->assertSuccessful();
    }

    public function test_sanitizer_restores_section_headings_and_their_ids(): void
    {
        $html = (new HtmlSanitizer)->clean(
            '<ul><li><a href="#types_paper">Types</a></li></ul>'
            .'<div id="types_paper"><strong>Types of paper</strong></div><p>Text</p>'
            .'<div id="auth_duty"><strong>1.</strong> <strong>Authors’ duties</strong></div>'
            .'<p><em>Units</em><br />Follow SI.</p>'
            .'<p><strong>DISCLAIMER</strong></p>',
        )['html'];

        $this->assertStringContainsString('<h2 id="types_paper">Types of paper</h2>', $html);
        $this->assertStringContainsString('<h2 id="auth_duty">Authors’ duties</h2>', $html);
        $this->assertStringContainsString('<h3 id="units">Units</h3><p>Follow SI.</p>', $html);
        $this->assertStringContainsString('<h2 id="disclaimer">Disclaimer</h2>', $html);
    }

    public function test_sanitizer_builds_checklists_and_labelled_links(): void
    {
        $sanitizer = new HtmlSanitizer;
        $html = $sanitizer->clean(
            '<p>Ensure that:<br />&#8211; E-mail address<br />&#8211; Keywords</p>'
            .'<p>See http://www.icmje.org. Write to magl@ff.ukim.edu.mk</p>'
            .'<p>(<a href="http://publicationethics.org/resources/guidelines">http://publicationethics.org/resources/guidelines</a>)</p>',
        )['html'];

        $this->assertStringContainsString('<p>Ensure that:</p><ul class="checklist"><li>E-mail address</li><li>Keywords</li></ul>', $html);
        $this->assertStringContainsString('<a href="http://www.icmje.org">icmje.org</a>.', $html);
        $this->assertStringContainsString('<a href="mailto:magl@ff.ukim.edu.mk">magl@ff.ukim.edu.mk</a>', $html);
        $this->assertStringContainsString('>publicationethics.org</a>', $html);

        // Running it again changes nothing, and unknown classes are dropped.
        $this->assertSame($html, $sanitizer->clean($html)['html']);
        $this->assertStringNotContainsString('class', $sanitizer->clean('<ul class="x"><li>a</li></ul>')['html']);
    }

    public function test_address_pages_keep_their_line_structure(): void
    {
        $html = (new HtmlSanitizer)->clean('<p><em>Apostolski Slobodan</em><br />Outpatient Neurological Clinic</p>')['html'];

        $this->assertStringNotContainsString('<h3', $html);
    }

    public function test_repair_pages_resolves_every_in_page_link(): void
    {
        $this->repair();

        $this->assertSame(12, Page::count());

        Page::all()->each(function (Page $page) {
            $this->assertSame([], RepairPages::brokenFragments($page), "Broken in-page links on {$page->path}");
        });

        foreach (self::ANCHORS as $path => $ids) {
            $body = Page::where('path', $path)->value('body');

            foreach ($ids as $id) {
                $this->assertStringContainsString("<h2 id=\"{$id}\">", $body, "#{$id} on {$path}");
            }
        }
    }

    public function test_repair_pages_sets_english_and_macedonian_titles(): void
    {
        $this->repair();

        Page::all()->each(function (Page $page) {
            $this->assertNotEmpty($page->title_mk, "title_mk of {$page->path}");
            $this->assertNotEmpty($page->summary, "summary of {$page->path}");
        });

        $this->assertSame('Editorial policies', Page::where('path', 'guidelines/editorial-policies')->value('title'));
        $this->assertSame('Submit a manuscript', Page::where('path', 'submit-your-paper')->value('title'));
        $this->assertSame('Editorial', Page::where('path', 'editorial')->value('title'));
        $this->assertSame('', Page::where('path', 'submit-your-paper')->value('body'));
    }

    public function test_board_members_are_parsed_from_the_old_page(): void
    {
        $this->repair();

        $this->assertSame(32, BoardMember::count());

        $chief = BoardMember::where('group', BoardMember::GROUP_EDITOR_IN_CHIEF)->sole();
        $this->assertSame(['Svetlana', 'Kulevanova', 'Editor-in-Chief'], [$chief->given_name, $chief->family_name, $chief->role]);

        $secretary = BoardMember::where('group', BoardMember::GROUP_SECRETARY)->sole();
        $this->assertSame(['Marija', 'Glavas Dodov'], [$secretary->given_name, $secretary->family_name]);

        // "Family Given" on the old page → given / family.
        $member = BoardMember::where('family_name', 'Apostolski')->sole();
        $this->assertSame(['Slobodan', 'Outpatient Neurological Clinic', 'Belgrade', 'Serbia'], [$member->given_name, $member->affiliation, $member->city, $member->country]);

        $this->assertSame('Denmark', BoardMember::where('family_name', 'Fjalland')->value('country'));
        $this->assertSame('United States', BoardMember::where('family_name', 'Tanasijevic')->value('country'));
        $this->assertSame('Afonso Miguel das Neves', BoardMember::where('family_name', 'Cavaco')->value('given_name'));

        // No street addresses, no invented titles or ORCIDs.
        BoardMember::all()->each(function (BoardMember $m) {
            $this->assertDoesNotMatchRegularExpression('/\d/', (string) $m->affiliation.$m->city);
            $this->assertNull($m->title);
            $this->assertNull($m->orcid);
        });

        $this->assertSame(0, BoardMember::where('country', 'Macedonia')->count());
        // The list keeps the date the old page was last changed.
        $this->assertSame('2020-12-16', BoardMember::max('updated_at') ? substr((string) BoardMember::max('updated_at'), 0, 10) : null);
    }

    public function test_editorial_board_page_lists_members(): void
    {
        $this->repair();

        $this->get('/editorial-board')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/editorial-board')
                ->has('members', 32)
                ->where('members.0.group', 'editor-in-chief')
                ->where('members.1.group', 'secretary')
                ->where('members.2.familyName', 'Apostolski')
                ->where('updatedAt', '2020-12-16')
                ->where('updatedLabel', '16 December 2020'));
    }

    public function test_long_guides_get_a_table_of_contents_instead_of_the_inline_list(): void
    {
        $this->repair();

        $this->get('/guidelines/instructions-for-authors')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/page')
                ->has('toc', 9)
                ->where('toc.8.id', 'copy_notice')
                ->where('page.title', 'Instructions for authors')
                ->where('page.body', fn (string $body) => str_contains($body, 'id="copy_notice"')
                    && ! str_contains($body, 'href="/guidelines/instructions-for-authors#types_paper"'))
                ->where('section.path', 'guidelines')
                ->has('section.pages', 7));

        // Short pages have no table of contents.
        $this->get('/guidelines/article-processing-charges')
            ->assertInertia(fn (Assert $page) => $page->has('toc', 0));
    }

    public function test_guidelines_hub_links_all_seven_pages(): void
    {
        $this->repair();

        $this->get('/guidelines')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/guidelines')
                ->has('children', 7)
                ->where('children', fn ($children) => collect($children)->pluck('path')->sort()->values()->all() === [
                    'guidelines/aims-and-scope',
                    'guidelines/article-processing-charges',
                    'guidelines/downloads',
                    'guidelines/editorial-policies',
                    'guidelines/instructions-for-authors',
                    'guidelines/open-access-policy',
                    'guidelines/review-policies',
                ])
                ->where('children.0.summary', fn ($summary) => filled($summary)));
    }

    public function test_downloads_page_lists_files_with_sizes(): void
    {
        Storage::fake('journal');
        Storage::disk('journal')->put('downloads/AUTHOR DISCLOSURE FORM.docx', str_repeat('x', 2048));

        $this->repair();

        $this->get('/guidelines/downloads')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('files', 2)
                ->where('files.0.name', 'Author Disclosure Form')
                ->where('files.0.extension', 'docx')
                ->where('files.0.bytes', 2048)
                ->where('files.1.bytes', null));
    }

    public function test_editorial_cuts_the_sign_off_for_the_editor_card(): void
    {
        $this->repair();

        $this->get('/editorial')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('page.title', 'Editorial')
                ->where('page.signOff', true)
                ->where('page.body', fn (string $body) => ! str_contains($body, 'Sincerely') && ! str_contains($body, '<img')));
    }

    public function test_pages_pass_a_description_for_search_engines(): void
    {
        $this->repair();

        $meta = $this->get('/guidelines/review-policies')->viewData('meta');

        $this->assertSame('How manuscripts are handled, from submission to decision.', $meta['description']);

        $page = Page::where('path', 'guidelines/review-policies')->first();
        $page->summary = null;
        $this->assertStringStartsWith('The Macedonian Pharmaceutical Bulletin employ blind peer review', $page->description());
        $this->assertLessThanOrEqual(155, mb_strlen($page->description()));
    }

    public function test_macedonian_titles_are_sent_with_the_page(): void
    {
        $this->repair();

        $this->withUnencryptedCookie('locale', 'mk')
            ->get('/guidelines/review-policies')
            ->assertInertia(fn (Assert $page) => $page
                ->where('page.titleMk', 'Политика за рецензирање')
                ->where('section.titleMk', 'За автори'));

        $this->withUnencryptedCookie('locale', 'mk')
            ->get('/contact')
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/contact')
                ->where('title', 'Контакт'));
    }

    public function test_contact_page_uses_the_configured_address_only(): void
    {
        $this->repair();

        $response = $this->get('/contact')->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('journal/contact')
            ->where('page.title', 'Contact')
            ->missing('page.body')
            ->where('journal.address.street', config('journal.address.street'))
            ->where('journal.editorialEmail', 'macpharmbull@ff.ukim.edu.mk'));

        // The old contact text ("Majka Tereza 17") is not sent to the page.
        $response->assertDontSee('Majka Tereza 17');
    }

    public function test_information_pages_render(): void
    {
        Page::create(['path' => 'editorial', 'title' => 'Editorial', 'body' => '<p>x</p>']);

        $this->get('/about')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('journal/about')
            ->has('archive.firstVolume')
            ->has('archive.articles'));

        $this->get('/indexing')->assertOk()->assertInertia(fn (Assert $page) => $page->component('journal/indexing'));

        $this->get('/privacy')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('journal/privacy')
            ->where('cookies', fn ($cookies) => collect($cookies)->pluck('name')->contains('locale')
                && collect($cookies)->pluck('name')->contains('XSRF-TOKEN')));

        $this->get('/accessibility')->assertOk()->assertInertia(fn (Assert $page) => $page->component('journal/accessibility'));
    }

    public function test_board_seeder_leaves_an_existing_board_alone(): void
    {
        $this->repair();
        BoardMember::where('family_name', 'Kulevanova')->update(['title' => 'Prof. Dr.']);

        $this->repair();
        $this->assertSame('Prof. Dr.', BoardMember::where('family_name', 'Kulevanova')->value('title'));

        $this->artisan('journal:repair-pages', ['--source' => self::FIXTURE, '--board' => true])->assertSuccessful();
        $this->assertNull(BoardMember::where('family_name', 'Kulevanova')->value('title'));
    }
}
