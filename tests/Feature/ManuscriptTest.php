<?php

namespace Tests\Feature;

use App\Enums\ManuscriptStatus;
use App\Manuscripts\Content;
use App\Manuscripts\Rendering\ManuscriptRenderer;
use App\Models\Manuscript;
use App\Models\ManuscriptEvent;
use App\Models\ManuscriptImage;
use App\Models\ManuscriptVersion;
use App\Models\Page;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\Manuscripts\ManuscriptReceived;
use App\Notifications\Manuscripts\NewManuscriptForEditors;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\TestCase;

/**
 * Writing a manuscript on the journal template and sending it
 * (docs/backoffice): drafts, autosave, the template check, submission, who
 * may see what, and the rendered article.
 */
class ManuscriptTest extends TestCase
{
    use RefreshDatabase;

    private function doc(string ...$paragraphs): array
    {
        return ['type' => 'doc', 'content' => array_map(
            fn (string $text) => ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
            $paragraphs,
        )];
    }

    /** A complete manuscript that passes the check. */
    private function completeContent(): array
    {
        return [
            'schema' => 1,
            'title' => $this->doc('Determination of sugars in fruit juices'),
            'runningTitle' => 'Sugars in fruit juices',
            'abstract' => $this->doc('Sugars were determined by HPLC in twenty juices.'),
            'keywords' => ['sugars', 'fruit juices', 'HPLC'],
            'authors' => [[
                'id' => 'a1', 'givenName' => 'Ana', 'familyName' => 'Petrovska',
                'givenNameAlt' => 'Ана', 'familyNameAlt' => 'Петровска',
                'email' => 'ana@example.org', 'orcid' => '0000-0002-1825-0097', 'phone' => '+389 2 3126 032',
                'affiliations' => ['f1'], 'corresponding' => true,
            ]],
            'affiliations' => [['id' => 'f1', 'text' => 'Faculty of Pharmacy, Skopje', 'textAlt' => 'Фармацевтски факултет, Скопје']],
            'sections' => [
                ['key' => 'introduction', 'heading' => 'Introduction', 'body' => $this->doc('Fruit juices are…')],
                ['key' => 'methods', 'heading' => 'Material and methods', 'body' => [
                    'type' => 'doc',
                    'content' => [
                        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Samples.']]],
                        ['type' => 'tableBlock', 'content' => [
                            ['type' => 'tableCaption', 'content' => [['type' => 'text', 'text' => 'Methods']]],
                            ['type' => 'table', 'content' => [
                                ['type' => 'tableRow', 'content' => [
                                    ['type' => 'tableHeader', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Titrant']]]]],
                                ]],
                                ['type' => 'tableRow', 'content' => [
                                    ['type' => 'tableCell', 'attrs' => ['align' => 'center', 'colspan' => 1], 'content' => [['type' => 'paragraph', 'content' => [
                                        ['type' => 'text', 'text' => 'Na'],
                                        ['type' => 'text', 'text' => '2', 'marks' => [['type' => 'subscript']]],
                                    ]]]],
                                ]],
                            ]],
                            ['type' => 'tableNotes', 'content' => [['type' => 'tableNote', 'attrs' => ['marker' => '*'], 'content' => [['type' => 'text', 'text' => 'Industrial.']]]]],
                        ]],
                    ],
                ]],
                ['key' => 'results', 'heading' => 'Results and discussion', 'body' => $this->doc('The results…')],
                ['key' => 'conclusion', 'heading' => 'Conclusion', 'body' => $this->doc('In conclusion…')],
            ],
            'acknowledgements' => null,
            'conflictOfInterest' => 'The authors declare no conflict of interest.',
            'funding' => '',
            'references' => $this->doc('Tyagi, S., 2014. Juices. Food Chem. 1, 1–2.'),
            'summary' => [
                'title' => $this->doc('Определување шеќери во овошни сокови'),
                'abstract' => $this->doc('Шеќерите се определени со HPLC.'),
                'keywords' => ['шеќери', 'сокови', 'HPLC'],
            ],
        ];
    }

    private function completeSubmission(): array
    {
        return [
            'suggestedReviewers' => [
                ['name' => 'R One', 'affiliation' => 'Uni A', 'email' => 'one@example.org'],
                ['name' => 'R Two', 'affiliation' => 'Uni B', 'email' => 'two@example.org'],
                ['name' => 'R Three', 'affiliation' => 'Uni C', 'email' => 'three@example.org'],
            ],
            'coverLetter' => 'Dear editor…',
            'declarations' => array_fill_keys(array_keys(config('manuscript.declarations')), true),
        ];
    }

    private function newDraft(User $author): Manuscript
    {
        $this->actingAs($author)
            ->post('/author/manuscripts', ['type' => 'original_scientific_paper', 'language' => 'en'])
            ->assertRedirect();

        return Manuscript::latest('id')->firstOrFail();
    }

    private function save(User $author, Manuscript $m, array $content, array $submission, ?int $lock = null)
    {
        return $this->actingAs($author)->putJson("/author/manuscripts/{$m->public_id}/draft", [
            'content' => $content,
            'submission' => $submission,
            'type' => $m->type,
            'language' => $m->language,
            'lock' => $lock ?? $m->draft()->value('lock_version'),
        ]);
    }

    public function test_an_author_starts_a_draft_on_the_template(): void
    {
        $author = User::factory()->author()->create(['given_name' => 'Ana', 'family_name' => 'Petrovska']);
        $m = $this->newDraft($author);

        $this->assertSame(ManuscriptStatus::Draft, $m->status);
        $this->assertNull($m->reference);
        $this->assertSame(0, ManuscriptEvent::count(), 'Drafts leave no history.');

        $this->get("/author/manuscripts/{$m->public_id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('author/manuscripts/edit')
                ->where('manuscript.status', 'draft')
                ->where('content.authors.0.givenName', 'Ana')
                ->where('content.authors.0.corresponding', true)
                ->where('content.sections.0.heading', 'Introduction')
                ->where('content.sections.1.key', 'methods')
                ->has('content.sections', 4)
                ->where('template.keywords.min', 3)
                ->where('lock', 1)
                ->has('issues')
            );
    }

    public function test_review_papers_get_a_free_section_between_introduction_and_conclusion(): void
    {
        $author = User::factory()->author()->create();
        $this->actingAs($author)->post('/author/manuscripts', ['type' => 'review_paper']);
        $content = Manuscript::sole()->draft->content;

        $this->assertSame('introduction', $content['sections'][0]['key']);
        $this->assertStringStartsWith('custom-', $content['sections'][1]['key']);
        $this->assertSame('conclusion', $content['sections'][2]['key']);
    }

    public function test_only_types_allow_their_languages(): void
    {
        $author = User::factory()->author()->create();

        $this->actingAs($author)->post('/author/manuscripts', ['type' => 'original_scientific_paper', 'language' => 'mk']);
        $this->assertSame('en', Manuscript::latest('id')->first()->language);

        $this->actingAs($author)->post('/author/manuscripts', ['type' => 'professional_paper', 'language' => 'mk']);
        $this->assertSame('mk', Manuscript::latest('id')->first()->language);
    }

    public function test_autosave_stores_normalised_content_and_returns_the_check(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $content = $this->completeContent();
        $content['evil'] = '<script>';
        $content['authors'][0]['affiliations'][] = 'not-an-affiliation';

        $response = $this->save($author, $m, $content, ['declarations' => []])
            ->assertOk()
            ->assertJsonPath('lock', 2)
            ->assertJsonStructure(['lock', 'savedAt', 'issues' => [['level', 'field', 'message']]]);

        $fields = array_column($response->json('issues'), 'field');
        $this->assertContains('declarations', $fields);
        $this->assertContains('suggestedReviewers', $fields);
        $this->assertNotContains('title', $fields);

        $m->refresh();
        $this->assertSame('Determination of sugars in fruit juices', $m->title);
        $this->assertArrayNotHasKey('evil', $m->draft->content);
        $this->assertSame(['f1'], $m->draft->content['authors'][0]['affiliations']);
    }

    public function test_a_stale_window_cannot_overwrite_newer_text(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);

        $this->save($author, $m, $this->completeContent(), [], 1)->assertOk();
        $this->save($author, $m, Content::blank($m->type, 'en', $author), [], 1)->assertStatus(409);

        $this->assertSame('Determination of sugars in fruit juices', $m->fresh()->title);
    }

    public function test_the_check_finds_what_is_missing(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $content = $this->completeContent();
        $content['title'] = null;
        $content['keywords'] = ['one'];
        $content['authors'][0]['phone'] = '';
        $content['sections'][2]['body'] = Content::emptyDoc();
        $content['sections'][1]['body']['content'][1]['content'][0]['content'] = [];

        $issues = collect($this->save($author, $m, $content, $this->completeSubmission())->json('issues'));
        $errors = $issues->where('level', 'error');

        $this->assertTrue($errors->contains('field', 'title'));
        $this->assertTrue($errors->contains('field', 'keywords'));
        $this->assertTrue($errors->contains('field', 'authors.a1'));
        $this->assertTrue($errors->contains('field', 'sections.results'));
        $this->assertTrue($errors->contains(fn ($i) => $i['field'] === 'sections.methods' && str_contains($i['message'], 'caption')));
    }

    public function test_an_incomplete_manuscript_cannot_be_sent(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);

        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit")->assertSessionHasErrors('manuscript');

        $this->assertSame(ManuscriptStatus::Draft, $m->fresh()->status);
    }

    public function test_sending_freezes_version_one_numbers_it_and_notifies(): void
    {
        Notification::fake();
        $editor = User::factory()->admin()->create();
        $author = User::factory()->author()->create();

        // A website-form submission took the first number of the year.
        Submission::create([
            'name' => 'X', 'email' => 'x@example.org', 'title' => 'Old', 'type' => 'Original scientific paper',
            'file_path' => 'submissions/x.pdf', 'file_name' => 'x.pdf', 'file_size' => 1,
        ]);

        $m = $this->newDraft($author);
        $this->save($author, $m, $this->completeContent(), $this->completeSubmission())->assertOk();

        $this->actingAs($author)
            ->post("/author/manuscripts/{$m->public_id}/submit")
            ->assertSessionHasNoErrors()
            ->assertRedirect("/author/manuscripts/{$m->public_id}");

        $m->refresh();
        $this->assertSame(ManuscriptStatus::Submitted, $m->status);
        $this->assertSame(sprintf('MPB-%s-0002', now()->format('Y')), $m->reference);
        $this->assertNotNull($m->received_at);
        $this->assertSame(1, $m->current_round);

        $version = ManuscriptVersion::sole();
        $this->assertSame(1, $version->number);
        $this->assertSame('Determination of sugars in fruit juices', $version->content['title']['content'][0]['content'][0]['text']);

        $event = ManuscriptEvent::sole();
        $this->assertSame('submitted', $event->type);
        $this->assertSame(ManuscriptStatus::Draft, $event->from_status);
        $this->assertSame(ManuscriptStatus::Submitted, $event->to_status);
        $this->assertSame($author->id, $event->actor_id);

        Notification::assertSentTo($author, ManuscriptReceived::class);
        // To the editorial mailbox, in Macedonian; not to each editor's own address.
        Notification::assertSentOnDemand(NewManuscriptForEditors::class, fn ($n, $channels, $notifiable) => ($notifiable->routes['mail'] ?? null) === ['macpharmbull@ff.ukim.edu.mk' => config('journal.name_en')] && $n->locale === 'mk');
        Notification::assertNotSentTo($editor, NewManuscriptForEditors::class);

        // Sent once: a second click changes nothing, and the text is locked.
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit")->assertForbidden();
        $this->save($author, $m, $this->completeContent(), [])->assertForbidden();
        $this->actingAs($author)->get("/author/manuscripts/{$m->public_id}/edit")->assertRedirect("/author/manuscripts/{$m->public_id}");
    }

    public function test_versions_and_events_are_immutable(): void
    {
        Notification::fake();
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $this->save($author, $m, $this->completeContent(), $this->completeSubmission());
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit");

        try {
            ManuscriptVersion::sole()->update(['kind' => 'changed']);
            $this->fail('Versions must not change.');
        } catch (LogicException) {
        }

        $this->expectException(QueryException::class);
        DB::table('manuscript_events')->update(['type' => 'changed']);
    }

    public function test_the_author_follows_the_status_and_history(): void
    {
        Notification::fake();
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $this->save($author, $m, $this->completeContent(), $this->completeSubmission());
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit");

        $this->get("/author/manuscripts/{$m->public_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('author/manuscripts/show')
                ->where('manuscript.status', 'submitted')
                ->where('manuscript.authorsLine', 'Ana Petrovska')
                ->where('editUrl', null)
                ->where('events.0.toStatus', 'submitted')
                ->where('html', fn (string $html) => str_contains($html, 'Determination of sugars') && str_contains($html, '<sub>2</sub>'))
            );

        $this->get('/author/manuscripts')
            ->assertInertia(fn (Assert $page) => $page->where('manuscripts.0.status', 'submitted'));
    }

    public function test_others_cannot_see_or_change_a_manuscript(): void
    {
        Notification::fake();
        $author = User::factory()->author()->create();
        $other = User::factory()->author()->create();
        $admin = User::factory()->admin()->create();
        $m = $this->newDraft($author);

        $this->actingAs($other)->get("/author/manuscripts/{$m->public_id}/edit")->assertForbidden();
        $this->actingAs($other)->get("/author/manuscripts/{$m->public_id}/preview")->assertForbidden();
        $this->save($other, $m, $this->completeContent(), [])->assertForbidden();
        $this->actingAs($other)->delete("/author/manuscripts/{$m->public_id}")->assertForbidden();

        // Reviewers and admins without the author role have no author pages.
        $this->actingAs(User::factory()->reviewer()->create())->get('/author/manuscripts')->assertForbidden();

        // Drafts are private, even to the editorial office.
        $this->actingAs($admin)->get("/admin/manuscripts/{$m->public_id}")->assertForbidden();
        $this->actingAs($admin)->get('/admin/manuscripts')->assertInertia(fn (Assert $page) => $page->has('manuscripts', 0));

        $this->save($author, $m, $this->completeContent(), $this->completeSubmission());
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit");

        $this->actingAs($admin)->get('/admin/manuscripts')
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/manuscripts/index')
                ->has('manuscripts', 1)
                ->where('manuscripts.0.submitter.id', $author->id)
                ->where('counts.submitted', 1)
            );

        $this->actingAs($admin)->get("/admin/manuscripts/{$m->public_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/manuscripts/show')
                ->has('submission.suggestedReviewers', 3)
                ->where('submission.declarations.original', true)
                ->has('events', 1)
            );
    }

    public function test_a_draft_can_be_deleted_without_a_trace(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);

        $this->actingAs($author)->delete("/author/manuscripts/{$m->public_id}")->assertRedirect('/author/manuscripts');

        $this->assertDatabaseCount('manuscripts', 0);
        $this->assertDatabaseCount('manuscript_drafts', 0);
    }

    public function test_the_renderer_escapes_text_and_drops_unknown_nodes(): void
    {
        $content = Content::normalise($this->completeContent());
        $content['title'] = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
            ['type' => 'text', 'text' => '<img src=x onerror=alert(1)>', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]],
        ]]]];
        $content['sections'][0]['body']['content'][] = ['type' => 'iframe', 'attrs' => ['src' => 'https://evil.example']];
        $content['sections'][0]['body']['content'][] = ['type' => 'table', 'content' => [['type' => 'tableRow', 'content' => [
            ['type' => 'tableCell', 'attrs' => ['align' => 'left;background:url(x)', 'colspan' => '2" onclick="x'], 'content' => []],
        ]]]];

        $html = ManuscriptRenderer::render($content, ['type' => 'original_scientific_paper', 'language' => 'en']);

        $this->assertStringContainsString('&lt;img src=x onerror=alert(1)&gt;', $html);
        $this->assertStringNotContainsString('<img', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('iframe', $html);
        $this->assertStringNotContainsString('onclick', $html);
        $this->assertStringNotContainsString('background', $html);
        $this->assertStringContainsString('<sup>1*</sup>', $html);
        $this->assertStringContainsString('<thead><tr><th>Titrant</th></tr></thead>', $html);
        $this->assertStringContainsString('<td style="text-align: center">Na<sub>2</sub></td>', $html);
        $this->assertStringContainsString('Резиме', $html);
    }

    public function test_the_public_form_now_points_to_the_manuscript_system(): void
    {
        Page::create(['path' => 'submit-your-paper', 'title' => 'Submit your paper', 'body' => '']);

        $this->get('/submit-your-paper')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('submission', null)
                ->where('submitAccess.signedIn', false)
                ->where('submitAccess.register', route('register'))
            );

        $this->post('/submit-your-paper', ['title' => 'x'])->assertRedirect(route('register'));
        $this->assertDatabaseCount('submissions', 0);
    }

    /** A PNG with a text chunk (as cameras and editors leave behind). */
    private function pngWithMetadata(): UploadedFile
    {
        $image = imagecreatetruecolor(40, 20);
        imagefill($image, 0, 0, imagecolorallocate($image, 30, 60, 140));
        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();

        // Insert a tEXt chunk "Author\0Jane Secret" before IEND.
        $data = "Author\0Jane Secret";
        $chunk = pack('N', strlen($data)).'tEXt'.$data.pack('N', crc32('tEXt'.$data));
        $png = substr($png, 0, -12).$chunk.substr($png, -12);

        return UploadedFile::fake()->createWithContent('chromatogram.png', $png);
    }

    public function test_figure_images_are_cleaned_stored_privately_and_shown_only_to_who_may_see(): void
    {
        Storage::fake('local');
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);

        $response = $this->actingAs($author)
            ->post("/author/manuscripts/{$m->public_id}/images", ['image' => $this->pngWithMetadata()], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('width', 40)
            ->assertJsonPath('height', 20);

        $image = ManuscriptImage::sole();
        $stored = Storage::disk('local')->get($image->path);
        $this->assertStringNotContainsString('Jane Secret', $stored, 'Metadata is stripped.');
        $this->assertSame('image/png', $image->mime);
        $this->assertSame($response->json('url'), route('manuscripts.image', [$m->public_id, $image->public_id]));

        $this->actingAs($author)->get($response->json('url'))->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->actingAs(User::factory()->author()->create())->get($response->json('url'))->assertForbidden();

        // Not an image.
        $this->actingAs($author)
            ->post("/author/manuscripts/{$m->public_id}/images", ['image' => UploadedFile::fake()->createWithContent('x.png', '<?php echo 1;')], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        // Another manuscript's image id is not accepted in this one.
        $other = $this->newDraft($author);
        $this->actingAs($author)->get(route('manuscripts.image', [$other->public_id, $image->public_id]))->assertNotFound();
    }

    public function test_figures_are_rendered_and_checked(): void
    {
        Storage::fake('local');
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/images", ['image' => $this->pngWithMetadata()], ['Accept' => 'application/json']);
        $imageId = ManuscriptImage::sole()->public_id;

        $content = $this->completeContent();
        $content['sections'][2]['body']['content'][] = [
            'type' => 'figure',
            'attrs' => ['image' => $imageId, 'alt' => 'Chromatogram', 'width' => 75],
            'content' => [['type' => 'figureCaption', 'content' => [['type' => 'text', 'text' => 'Chromatogram of the standard solution']]]],
        ];
        $content['sections'][2]['body']['content'][] = [
            'type' => 'figure',
            'attrs' => ['image' => 'not-ours', 'alt' => '', 'width' => 33],
            'content' => [['type' => 'figureCaption']],
        ];

        $issues = collect($this->save($author, $m, $content, $this->completeSubmission())->json('issues'));
        $this->assertTrue($issues->contains(fn ($i) => $i['level'] === 'error' && str_contains($i['message'], 'Figure 2 has no caption')));
        $this->assertTrue($issues->contains(fn ($i) => $i['level'] === 'warning' && str_contains($i['message'], 'Figure 2')));
        $this->assertFalse($issues->contains(fn ($i) => str_contains($i['message'], 'Figure 1')));

        $html = $this->actingAs($author)->getJson("/author/manuscripts/{$m->public_id}/preview")->json('html');
        $this->assertStringContainsString('<figure class="ms-figure ms-w-75"><img src="'.e(route('manuscripts.image', [$m->public_id, $imageId])).'" alt="Chromatogram"', $html);
        $this->assertStringContainsString('<figcaption class="ms-figure-caption">Chromatogram of the standard solution</figcaption>', $html);
        // An image that is not this manuscript's is never linked; a bad width falls back to 100.
        $this->assertStringNotContainsString('not-ours', $html);
        $this->assertStringContainsString('ms-figure ms-w-100', $html);
    }

    public function test_spaces_next_to_formatting_survive_autosave(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $content = $this->completeContent();
        $content['sections'][0]['body'] = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
            ['type' => 'text', 'text' => 'Correlation coefficient, '],
            ['type' => 'text', 'text' => 'r', 'marks' => [['type' => 'italic']]],
            ['type' => 'text', 'text' => ' of the '],
            ['type' => 'text', 'text' => 'in vitro', 'marks' => [['type' => 'italic']]],
            ['type' => 'text', 'text' => ' study'],
        ]]]];

        $this->save($author, $m, $content, $this->completeSubmission())->assertOk();

        $this->assertSame(
            $content['sections'][0]['body'],
            $m->fresh()->draft->content['sections'][0]['body'],
        );
    }

    public function test_the_manuscript_downloads_as_a_valid_word_file(): void
    {
        $author = User::factory()->author()->create();
        $m = $this->newDraft($author);
        $content = $this->completeContent();
        // Characters that must be escaped in the XML.
        $content['sections'][0]['body'] = $this->doc('Conductivity < 0.1 µS/cm & pH > 3 "quoted"');
        $this->save($author, $m, $content, $this->completeSubmission())->assertOk();

        $response = $this->actingAs($author)->get("/manuscripts/{$m->public_id}/docx")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        $this->assertStringContainsString('.docx', (string) $response->headers->get('Content-Disposition'));

        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($response->getFile()->getPathname()) === true);
        $xml = (string) $zip->getFromName('word/document.xml');
        $zip->close();

        $dom = new \DOMDocument;
        $this->assertTrue($dom->loadXML($xml), 'document.xml is well-formed');
        $this->assertStringContainsString('Conductivity &lt; 0.1', $xml);
        $this->assertStringContainsString('Determination of sugars in fruit juices', $xml);
        $this->assertStringContainsString('w:vertAlign w:val="subscript"', $xml);
        $this->assertStringContainsString('Table 1.', $xml);
        $this->assertStringContainsString('Резиме', $xml);
        $this->assertStringNotContainsString('w:firstLine="0" w:hanging', $xml);

        $this->actingAs(User::factory()->author()->create())->get("/manuscripts/{$m->public_id}/docx")->assertForbidden();
    }

    public function test_the_editorial_office_assigns_the_doi_and_publication_details(): void
    {
        Notification::fake();
        $author = User::factory()->author()->create();
        $admin = User::factory()->admin()->create();
        $m = $this->newDraft($author);
        $this->save($author, $m, $this->completeContent(), $this->completeSubmission());
        $this->actingAs($author)->post("/author/manuscripts/{$m->public_id}/submit");

        $details = [
            'doi' => '10.33320/maced.pharm.bull.2026.72.02.004',
            'volume' => 72, 'issue' => '2', 'first_page' => 31, 'last_page' => 40, 'publication_year' => 2026,
        ];

        // Only the editorial office.
        $this->actingAs($author)->put("/admin/manuscripts/{$m->public_id}/publication", $details)->assertForbidden();

        $this->actingAs($admin)->put("/admin/manuscripts/{$m->public_id}/publication", $details)->assertSessionHasNoErrors();

        $m->refresh();
        $this->assertSame('10.33320/maced.pharm.bull.2026.72.02.004', $m->doi);
        $this->assertSame('72 (2) 31 – 40 (2026)', $m->citationLine());
        $this->assertSame('10.33320/maced.pharm.bull.2026.72.02.004', $m->suggestedDoi(4));
        $this->assertSame('publication_details_updated', $m->events()->latest('id')->first()->type);

        $html = $this->actingAs($admin)->get("/admin/manuscripts/{$m->public_id}")
            ->assertInertia(fn (Assert $page) => $page->where('publication.doi', $details['doi'])->where('publication.volume', 72))
            ->viewData('page')['props']['html'];
        $this->assertStringContainsString('<em>Macedonian pharmaceutical bulletin</em>, <strong>72</strong> (2) 31 – 40 (2026)', $html);
        $this->assertStringContainsString('DOI: 10.33320/maced.pharm.bull.2026.72.02.004', $html);

        // Bad DOI, last page before first, a DOI of a published article.
        $this->actingAs($admin)
            ->put("/admin/manuscripts/{$m->public_id}/publication", ['doi' => 'not a doi', 'first_page' => 40, 'last_page' => 31])
            ->assertSessionHasErrors(['doi', 'last_page']);
    }
}
