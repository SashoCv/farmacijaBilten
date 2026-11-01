<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * WS1: the site shell (header, footer, developer credit, favicons, navigation).
 *
 * The header and footer are React components rendered by SSR, which the test
 * kernel does not run, so the credit and layout are guarded at the source
 * level and the navigation targets are requested through the kernel.
 */
class ShellTest extends TestCase
{
    use RefreshDatabase;

    private const NEXSOL = 'https://nexsollabs.com';

    private function source(string $path): string
    {
        return (string) file_get_contents(resource_path('js/'.$path));
    }

    public function test_the_footer_bottom_bar_carries_the_developer_credit(): void
    {
        $bar = $this->source('components/journal/footer-bottom-bar.tsx');

        $this->assertSame(1, substr_count($bar, "'".self::NEXSOL."'"), 'The credit URL is defined once.');
        $this->assertStringContainsString('href={DEVELOPER_URL}', $bar);
        $this->assertStringContainsString('Nexsol Labs', $bar);
        $this->assertStringContainsString("t('Design & development:')", $bar);
        // Links to other websites open in a new tab.
        $this->assertMatchesRegularExpression('/href=\{DEVELOPER_URL\}\s+target="_blank"\s+rel="noopener[^"]*"/', $bar);
        $this->assertStringNotContainsString('nofollow', $bar);
    }

    public function test_every_journal_page_renders_the_one_footer(): void
    {
        $layout = $this->source('layouts/journal-layout.tsx');
        $footer = $this->source('components/journal/site-footer.tsx');

        $this->assertStringContainsString('<SiteFooter />', $layout);
        $this->assertStringNotContainsString('component ===', $layout, 'The footer must not depend on the page.');
        $this->assertStringContainsString('<FooterBottomBar />', $footer);
        $this->assertStringContainsString("t('Site footer')", $footer);

        // The compact footer (which had no credit) is gone everywhere.
        foreach ($this->jsFiles() as $file) {
            $this->assertStringNotContainsString('SiteFooterCompact', (string) file_get_contents($file), $file);
        }

        // No other part of the journal shell or its pages repeats the developer
        // URL, so each journal page has exactly one link. (The sign-in layout,
        // which does not use the journal shell, carries its own.)
        $journalFiles = array_filter(
            $this->jsFiles(),
            fn (string $file) => preg_match('#/(components|pages)/journal/|/layouts/journal-layout\.tsx$|/lib/#', $file) === 1,
        );
        $mentions = array_filter(
            $journalFiles,
            fn (string $file) => str_contains((string) file_get_contents($file), self::NEXSOL),
        );
        $this->assertSame(
            [resource_path('js/components/journal/footer-bottom-bar.tsx')],
            array_values($mentions),
        );
    }

    public function test_the_footer_licence_comes_from_the_shared_journal_prop(): void
    {
        $bar = $this->source('components/journal/footer-bottom-bar.tsx');

        $this->assertStringContainsString('usePage().props.journal', $bar);
        $this->assertStringNotContainsString('CC BY 3', $bar);
        $this->assertStringNotContainsString('CC BY 4', $bar);

        Page::create(['path' => 'contact', 'title' => 'Contact', 'body' => '<p>Contact</p>']);

        $this->get('/contact')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('journal.licence.name', config('journal.licence.name'))
            ->where('journal.licence.url', config('journal.licence.url'))
            ->where('journal.issnPrint', '1409-8695')
            ->where('journal.issnOnline', '1857-8969')
            ->where('journal.doiPrefix', '10.33320')
            ->where('journal.indexing.0.url', 'https://doaj.org/toc/1857-8969')
        );
    }

    public function test_favicons_and_manifest_are_the_journals_own(): void
    {
        foreach (['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest'] as $file) {
            $this->assertFileExists(public_path($file));
            // The Laravel starter-kit logo path.
            $this->assertStringNotContainsString('M162.041', (string) file_get_contents(public_path($file)), $file);
        }

        $this->assertStringContainsString('#1F3770', (string) file_get_contents(public_path('favicon.svg')));

        $this->assertSame([180, 180], array_slice((array) getimagesize(public_path('apple-touch-icon.png')), 0, 2));
        $this->assertSame([192, 192], array_slice((array) getimagesize(public_path('icon-192.png')), 0, 2));
        $this->assertSame([512, 512], array_slice((array) getimagesize(public_path('icon-512.png')), 0, 2));

        $manifest = json_decode((string) file_get_contents(public_path('site.webmanifest')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(config('journal.name_en'), $manifest['name']);
        $this->assertSame(config('journal.abbrev'), $manifest['short_name']);
        $this->assertSame('#1F3770', $manifest['theme_color']);

        $purposes = array_column($manifest['icons'], 'purpose');
        $this->assertContains('maskable', $purposes);

        foreach ($manifest['icons'] as $icon) {
            $this->assertFileExists(public_path(ltrim($icon['src'], '/')));
        }
    }

    public function test_every_navigation_link_resolves(): void
    {
        Issue::create(['slug' => '71-2', 'volume' => 71, 'kind' => Issue::KIND_ISSUE, 'number' => 2, 'year' => 2025]);
        Journal::flush();

        $links = $this->siteLinks();

        // "For authors" lists every guideline page; "About" starts with the journal.
        $this->assertCount(7, array_filter($links, fn (string $href) => str_starts_with($href, '/guidelines/')));

        foreach ($links as $href) {
            $path = ltrim($href, '/');

            if (! in_array($path, ['about', 'indexing', 'contact', 'privacy', 'accessibility'], true)) {
                Page::firstOrCreate(
                    ['path' => $path],
                    [
                        'title' => ucfirst(str_replace(['guidelines/', '-'], ['', ' '], $path)),
                        'parent_path' => str_starts_with($path, 'guidelines/') ? 'guidelines' : null,
                        'body' => '<p>Text</p>',
                    ],
                );
            }
        }

        Page::firstOrCreate(['path' => 'guidelines'], ['title' => 'Guidelines', 'body' => '<p>Index</p>']);
        Page::firstOrCreate(['path' => 'contact'], ['title' => 'Contact', 'body' => '<p>Contact</p>']);

        // Header items that are not in site-links.ts.
        $links = [...$links, '/archive', '/early-online', '/search', '/issues/71-2'];

        foreach (array_unique($links) as $href) {
            $this->get($href)->assertOk();
        }
    }

    public function test_site_links_order_matches_the_navigation_contract(): void
    {
        $source = $this->source('lib/site-links.ts');

        // Other components link to authorLinks[0]; it must stay the instructions.
        $this->assertMatchesRegularExpression(
            "/authorLinks: SiteLink\\[\\] = \\[\\s*\\{\\s*label: 'Instructions for authors',\\s*href: '\\/guidelines\\/instructions-for-authors'/",
            $source,
        );
        $this->assertMatchesRegularExpression(
            "/aboutLinks: SiteLink\\[\\] = \\[\\s*\\{ label: 'About the journal', href: '\\/about' \\}/",
            $source,
        );
        $this->assertStringContainsString("{ label: 'Indexing and abstracting', href: '/indexing' }", $source);
        $this->assertStringContainsString("privacyHref = '/privacy'", $source);
        $this->assertStringContainsString("accessibilityHref = '/accessibility'", $source);
    }

    /**
     * Every path linked from site-links.ts.
     *
     * @return list<string>
     */
    private function siteLinks(): array
    {
        $source = $this->source('lib/site-links.ts');

        preg_match_all("/href: '([^']+)'/", $source, $hrefs);
        preg_match_all("/Href = '([^']+)'/", $source, $constants);

        return array_values(array_unique([...$hrefs[1], ...$constants[1]]));
    }

    /**
     * @return list<string>
     */
    private function jsFiles(): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(resource_path('js'), \FilesystemIterator::SKIP_DOTS));

        foreach ($iterator as $file) {
            if (in_array($file->getExtension(), ['ts', 'tsx'], true)) {
                $files[] = $file->getPathname();
            }
        }

        sort($files);

        return $files;
    }
}
