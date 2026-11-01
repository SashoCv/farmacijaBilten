<?php

namespace Tests\Unit;

use App\Journal\Import\TextRepair;
use PHPUnit\Framework\TestCase;

/**
 * Inputs are real strings from the imported database (before repair).
 */
class TextRepairTest extends TestCase
{
    public function test_english_typed_through_a_cyrillic_font_is_mapped_back(): void
    {
        $text = 'Тхе интродуцтион оф цѕцлоспорине А (ЦсА) инто тхе цлиницал працтице хас ресултед ин а мајор импровемент.';

        $this->assertTrue(TextRepair::isTransliteratedEnglish($text));
        $this->assertSame(
            'The introduction of cyclosporine A (CsA) into the clinical practice has resulted in a major improvement.',
            TextRepair::cyrillicToLatinKeys($text),
        );
        $this->assertSame('HPLC', TextRepair::cyrillicToLatinKeys('ХПЛЦ'));
    }

    public function test_real_macedonian_is_not_taken_for_transliterated_english(): void
    {
        $this->assertFalse(TextRepair::isTransliteratedEnglish(
            'Појавата на фалсификувани лекови е се почест растечки проблем и претставува општо јавно здравствена закана во светски рамки.',
        ));
        $this->assertFalse(TextRepair::isTransliteratedEnglish('The determination and quantification of sugars in fruit juices.'));
    }

    public function test_yuscii_codes_become_letters_with_diacritics(): void
    {
        $this->assertSame(
            'Institut za pretklinička i klinička farmakologija, Univerzitet vo Priština',
            TextRepair::yuscii('Institut za pretklini~ka i klini~ka farmakologija, Univerzitet vo Pri{tina'),
        );
        $this->assertSame('Danica Labudović', TextRepair::yuscii('Danica Labudovi}'));
        $this->assertSame('Stručen trud', TextRepair::yuscii('Stru~en trud'));
        $this->assertSame('Ljubica Šuturkova, Členovi, Lidija Petruševska', TextRepair::yuscii('Ljubica [uturkova, ^lenovi, Lidija Petru{evska'));
    }

    public function test_yuscii_leaves_modern_text_alone(): void
    {
        // Brackets, approximations and e-mail addresses are not font codes.
        $this->assertSame('Production of [18F]NaF', TextRepair::yuscii('Production of [18F]NaF'));
        $this->assertSame('in ~21% of patients', TextRepair::yuscii('in ~21% of patients'));
        $this->assertSame('Priština, e-mail: a|b@uni-pr.edu', TextRepair::yuscii('Pri{tina, e-mail: a|b@uni-pr.edu'));
        // A footnote mark after a name is dropped.
        $this->assertSame('Marija Gegovska, Marija Hiljadnikova', TextRepair::yuscii('Marija Gegovska^, Marija Hiljadnikova'));
    }

    public function test_cyrillic_look_alikes_in_latin_text_are_replaced(): void
    {
        $this->assertSame('used for determination of', TextRepair::homoglyphs('used for determinаtion of'));
        $this->assertSame('The column was maintained at 60 °C.', TextRepair::homoglyphs('The column was maintained at 60 °С.'));
        $this->assertSame('the risk was higher for TT vs TG+GG genotypes in the CCa group than in LSIL patients', TextRepair::homoglyphs('the risk was higher for ТТ vs ТG+GG genotypes in the CCa group than in LSIL patients'));
        $this->assertSame('Silvana Janevikj', TextRepair::homoglyphs('Silvana Janeviкј'));
        // Macedonian text keeps its letters.
        $this->assertSame('Фалсификат на лекови', TextRepair::homoglyphs('Фалсификат на лекови'));
    }

    public function test_typing_habits_are_fixed(): void
    {
        $this->assertSame('patients’ choice and EMA’s guideline', TextRepair::typography('patients` choice and EMA`s guideline'));
        $this->assertSame('4′-chloroacetanilide', TextRepair::typography('4`-chloroacetanilide'));
        $this->assertSame('in ∼21% of patients', TextRepair::typography('in ~21% of patients'));
    }

    public function test_history_lines_are_normalised_with_their_precision(): void
    {
        $this->assertSame(
            ['text' => 'Received: April 2006; Accepted: June 2006',
                'received' => ['date' => '2006-04-01', 'precision' => 'month'],
                'accepted' => ['date' => '2006-06-01', 'precision' => 'month']],
            TextRepair::history('Primen april 2006, prifaten juni 2006'),
        );

        $this->assertSame('Received: 6 December 2015; Accepted: 10 January 2016', TextRepair::history('Received: 6 December 2015; Accepted: 10 January 2016')['text']);
        $this->assertSame('Received: June 2016; Accepted: August 2016', TextRepair::history('Received: June2016, Accepted: August 2016')['text']);
        $this->assertSame('year', TextRepair::history('Primen 2006, prifaten juni 2006')['received']['precision']);
        // Body text that starts with "received" is not a history line.
        $this->assertNull(TextRepair::history('received a topical treatment that contained Rosa'));
    }

    public function test_history_tail_is_split_from_an_affiliation(): void
    {
        $this->assertSame(
            ['Institut za Klinička Biohemija, Skopje, R. Makedonija', 'Primen april 2006, prifaten juni 2006'],
            TextRepair::splitHistoryTail('Institut za Klinička Biohemija, Skopje, R. Makedonija Primen april 2006, prifaten juni 2006'),
        );
        $this->assertSame(['Faculty of Pharmacy, Skopje', null], TextRepair::splitHistoryTail('Faculty of Pharmacy, Skopje'));
    }

    public function test_types_use_the_journals_names(): void
    {
        $this->assertSame('Review paper', TextRepair::normalizeType('Review'));
        $this->assertSame('Case study', TextRepair::normalizeType('Case report'));
        $this->assertSame('Professional paper', TextRepair::normalizeType('Stru~en trud'));
        $this->assertSame('Professional paper', TextRepair::normalizeType('Стручен труд'));
        $this->assertSame('Original scientific paper', TextRepair::normalizeType('Original paper'));
        $this->assertSame('Short communication', TextRepair::normalizeType('Short paper'));
        $this->assertNull(TextRepair::normalizeType('Introduction'));
    }

    public function test_rich_titles_keep_only_inline_markup(): void
    {
        $this->assertSame(
            'Aseptic process validation of [<sup>18</sup>F]Sodium Fluoride',
            TextRepair::richTitle('<strong>Aseptic process validation of [<sup>18</sup>F]Sodium Fluoride</strong>'),
        );
        $this->assertSame('Production of [<sup>18</sup>F]NaF', TextRepair::richTitle('Production of [ 18 F]NaF'));
        $this->assertSame(
            'Classification of <i>Cannabis sativa</i> L. variety',
            TextRepair::richTitle('Classification of <em>Cannabis sativa </em>L<em>.</em> variety'),
        );
        $this->assertSame('similarity factor <i>f<sub>2</sub></i> – bringing', TextRepair::richTitle('similarity factor <em>f<sub>2 </sub></em>– bringing'));
        $this->assertNull(TextRepair::richTitle('A plain title'));
        $this->assertSame('[18F]NaF', TextRepair::plainTitle('[<sup>18</sup>F]NaF'));
    }

    public function test_page_furniture_is_removed_from_abstracts(): void
    {
        $this->assertSame(
            'mental health issues and malignancies. They represent a',
            TextRepair::cleanAbstract('mental     health       issues and malignancies. They represent a *Corresponding author e-mail: someone@example.com                4'),
        );
    }

    public function test_language_follows_the_majority_script(): void
    {
        $this->assertSame('mk', TextRepair::lang('Фалсификат на лекови'));
        $this->assertSame('en', TextRepair::lang('Counterfeit medicines'));
        // One stray Cyrillic letter does not make English text Macedonian.
        $this->assertSame('en', TextRepair::lang('Acrylamide levеls were analyzed'));
    }
}
