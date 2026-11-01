<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeTest extends TestCase
{
    use RefreshDatabase;

    /** The sentence the home page quotes, as it stands on the Editor's words page. */
    private const MISSION = 'The Macedonian Pharmaceutical Bulletin has a mission to be the premier periodical on basic pharmacy concepts, recent developments in pharmacy in general, with an aim of promoting Research and Development, Post-Graduate Training, and further enhancements in the field of Pharmacy, Medicine, Dental medicine and other life sciences.';

    private Issue $current;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('journal');

        $this->issue('47', 47, Issue::KIND_VOLUME, null, year: 2001);
        foreach ([[69, 1], [69, 2], [70, 1], [70, 2], [71, 1]] as [$volume, $number]) {
            $this->issue("{$volume}-{$number}", $volume, Issue::KIND_ISSUE, $number);
        }

        $this->current = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        foreach (range(1, 10) as $n) {
            $this->article($this->current, sprintf('%03d', $n), "Current article {$n}", '2025-04-30');
        }

        $supplement = $this->issue('72-s1', 72, Issue::KIND_SUPPLEMENT, 1, note: '8CPM');
        foreach (range(1, 14) as $n) {
            $this->article($supplement, sprintf('%03d', $n), "Contribution {$n}");
        }

        $early = $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);
        foreach (range(1, 12) as $n) {
            $this->article($early, sprintf('%03d', $n), "Early article {$n}", sprintf('2025-07-%02d', $n));
        }

        Page::create([
            'path' => 'editorial',
            'title' => 'Editor’s words',
            'body' => '<p><em>Macedonian Pharmaceutical Bulletin</em>, Online ISSN 1857-8969, is an international, peer-reviewed Journal.</p>'
                ."\n<p>".self::MISSION.'</p>'
                ."\n<p>The journal publishes original research articles.</p>",
        ]);

        Journal::flush();
    }

    public function test_home_lists_the_whole_current_issue_and_capped_tabs(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/home')
                ->where('currentIssue.slug', '71-2')
                ->has('currentArticles', 10)
                ->where('currentArticles.0.number', '001')
                ->where('supplement.slug', '72-s1')
                ->has('supplementArticles', 10)
                ->where('earlyOnlineCount', 12)
                ->has('earlyOnlineArticles', 10)
                // Newest online first.
                ->where('earlyOnlineArticles.0.title', 'Early article 12'));
    }

    public function test_editor_quote_is_the_source_sentence_word_for_word(): void
    {
        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('editorQuote', self::MISSION));
    }

    public function test_editor_quote_is_null_without_the_editorial_page(): void
    {
        Page::query()->where('path', 'editorial')->delete();

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('editorQuote', null));
    }

    public function test_current_issue_falls_back_to_the_printed_cover(): void
    {
        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('currentIssue.coverImage', null));

        Storage::disk('journal')->put('media/images/naslovna.jpg', 'jpeg');

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('currentIssue.coverImage', '/media/images/naslovna.jpg'));

        // A per-issue cover (WS9) wins over the fallback.
        $this->current->update(['cover_image' => 'media/covers/71-2.webp']);

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('currentIssue.coverImage', '/media/covers/71-2.webp'));
    }

    public function test_archive_strip_shows_six_recent_issues_and_where_the_archive_starts(): void
    {
        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('recentIssues', 6)
                // The current issue is featured above, and unpublished issues are left out.
                ->where('recentIssues', fn ($issues) => collect($issues)->pluck('slug')->doesntContain('71-2')
                    && collect($issues)->pluck('slug')->doesntContain('72-1'))
                ->where('recentIssues.0.slug', '72-s1')
                ->where('archiveStart', ['volume' => 47, 'year' => 2001])
                ->where('volumes.0.volume', 72));
    }

    public function test_home_renders_server_side_with_the_quote_and_cover(): void
    {
        Storage::disk('journal')->put('media/images/naslovna.jpg', 'jpeg');

        // The HTML carries the Inertia page data whether or not SSR is running.
        $html = $this->get(route('home'))->getContent();

        $this->assertStringContainsString('naslovna.jpg', $html);
        $this->assertStringContainsString('premier periodical on basic pharmacy concepts', $html);
    }

    private function issue(string $slug, int $volume, string $kind, ?int $number, ?string $note = null, bool $published = true, ?int $year = null): Issue
    {
        return Issue::create([
            'slug' => $slug,
            'volume' => $volume,
            'kind' => $kind,
            'number' => $number,
            'note' => $note,
            'year' => $year ?? $volume + 1954,
            'is_published' => $published,
        ]);
    }

    private function article(Issue $issue, string $number, string $title, ?string $online = null): Article
    {
        return $issue->articles()->create([
            'number' => $number,
            'position' => (int) $number,
            'title' => $title,
            'authors' => ['Ana Author', 'Boris Author'],
            'pdf' => "volumes/{$issue->slug}/{$number}.pdf",
            'online_at' => $online,
        ]);
    }
}
