<?php

namespace Tests\Feature;

use App\Mail\MailTemplates;
use App\Mail\TemplatedMail;
use App\Models\MailTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The e-mail templates: defaults in both languages, the editorial office's
 * own wording, preview and reset, and the journal's look.
 */
class MailTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_template_has_both_languages_and_known_placeholders(): void
    {
        foreach (MailTemplates::all() as $key => $t) {
            foreach (['en', 'mk'] as $locale) {
                $this->assertNotSame('', $t['subject'][$locale], "{$key} {$locale}");
                preg_match_all('/\{([a-z_]+)\}/', $t['subject'][$locale].' '.$t['body'][$locale], $m);

                foreach (array_unique($m[1]) as $name) {
                    $this->assertTrue($name === 'button' || array_key_exists($name, $t['placeholders']), "{$key}: {{$name}} is not documented");
                }
            }
        }
    }

    public function test_the_mail_uses_the_saved_wording_and_drops_empty_placeholders(): void
    {
        app()->setLocale('mk');
        MailTemplate::create(['key' => 'invitation_withdrawn', 'locale' => 'mk', 'subject' => 'Повлечена покана: {title}', 'body' => "Здраво {name},\n\n{reason_missing}\n\nБлагодариме."]);

        $mail = TemplatedMail::make('invitation_withdrawn', ['name' => 'Марко', 'title' => 'Шеќери', 'reference' => 'MPB-1']);
        $this->assertSame('Повлечена покана: Шеќери', $mail->subject);
        $this->assertSame(['Здраво Марко,', '{reason_missing}', 'Благодариме.'], $mail->introLines);

        $html = (string) TemplatedMail::make('message_to_author', ['name' => 'Ана', 'title' => 'T', 'reference' => 'R', 'message' => ''], 'https://example.org')->render();
        $this->assertStringContainsString('Македонски фармацевтски билтен', $html);
        $this->assertStringContainsString(config('journal.editorial_email'), $html);
        $this->assertStringNotContainsString('Laravel', $html);
        $this->assertStringNotContainsString('All rights reserved', $html);
    }

    public function test_the_editorial_office_edits_previews_and_resets_templates(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get('/admin/mail-templates')->assertInertia(fn (Assert $page) => $page
            ->component('admin/mail-templates/index')
            ->has('templates', count(MailTemplates::all()))
        );

        $this->actingAs($admin)->get('/admin/mail-templates/decision')->assertInertia(fn (Assert $page) => $page
            ->component('admin/mail-templates/edit')
            ->where('template.languages.mk.subject', 'Одлука за вашиот ракопис {reference}')
            ->has('template.placeholders.letter')
        );

        $default = MailTemplates::get('decision');
        $this->actingAs($admin)->put('/admin/mail-templates/decision', [
            'en' => ['subject' => 'Decision: {reference}', 'body' => "Dear {name},\n\n{letter}\n\n{button}"],
            'mk' => ['subject' => $default['subject']['mk'], 'body' => $default['body']['mk']],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, MailTemplate::count(), 'Unchanged Macedonian text is not stored.');
        $this->assertSame('Decision: {reference}', TemplatedMail::text('decision', 'en')[0]);

        $this->actingAs($admin)->postJson('/admin/mail-templates/decision/preview', ['locale' => 'en', 'subject' => 'Hello {name}', 'body' => "Hi {name}\n\n{button}"])
            ->assertOk()
            ->assertJsonPath('subject', 'Hello Ana Petrovska')
            ->assertJson(fn ($json) => $json->where('html', fn (string $html) => str_contains($html, 'Hi Ana Petrovska'))->etc());

        $this->actingAs($admin)->post('/admin/mail-templates/decision/reset')->assertSessionHasNoErrors();
        $this->assertSame(0, MailTemplate::count());

        $this->actingAs(User::factory()->author()->create())->get('/admin/mail-templates')->assertForbidden();
        $this->actingAs($admin)->get('/admin/mail-templates/nope')->assertNotFound();
    }
}
