<?php

namespace Tests\Unit;

use App\Journal\Import\IssueContentParser;
use PHPUnit\Framework\TestCase;

/**
 * Fixtures are trimmed copies of real posts from bulletin.mfd.org.mk.
 */
class IssueContentParserTest extends TestCase
{
    private function parse(string $html): array
    {
        return (new IssueContentParser)->parse($html);
    }

    public function test_authors_before_title_with_early_online_date(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Redzep Ali, Oliver Majstorov, Lidija<br />
            Petrushevska-Tozi<br />
            <strong>Analytical methods for determination of sugar content </strong>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 71_2/71_2_001.pdf">PDF</a>]<br />
            <strong>Early on-line  30 April 2025</strong></p>
            <p>Arijeta Shabani<br />
            <strong>Classification of <em>Cannabis sativa </em>L<em>.</em> variety Helena</strong> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 71_2/71_2_003.pdf">PDF</a>]<br />
            <strong>Early on-line  5 June 2025</strong></p>
            HTML);

        $this->assertCount(2, $result['articles']);
        [$first, $second] = $result['articles'];

        $this->assertSame('001', $first['number']);
        $this->assertSame('Analytical methods for determination of sugar content', $first['title']);
        $this->assertSame(['Redzep Ali', 'Oliver Majstorov', 'Lidija', 'Petrushevska-Tozi'], $first['authors']);
        $this->assertSame('volumes/Volume 71_2/71_2_001.pdf', $first['pdf']);
        $this->assertSame('2025-04-30', $first['online_at']);

        $this->assertSame('003', $second['number']);
        $this->assertSame('Classification of Cannabis sativa L. variety Helena', $second['title']);
        $this->assertSame(['Arijeta Shabani'], $second['authors']);
    }

    public function test_authors_after_title_with_full_issue_and_contents(): void
    {
        $result = $this->parse(<<<'HTML'
            <p><strong>68 (Suppl 1) full issue [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_3/68_3_000.pdf">PDF</a>]</strong></p>
            <p>Table of contents [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_3/68_3_289.pdf">PDF</a>]</p>
            <p><strong>Drug discovery and bio-exploration of nature</strong> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_3/68_3_001.pdf">PDF</a>]<br />
            Tytgat Jan</p>
            <p><strong>The Belgian Family Pharmacist [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_3/68_3_002.pdf">PDF</a>]</strong><br />
            Hendrik De Rocker, Jan Saevels</p>
            HTML);

        $this->assertSame('volumes/Volume 68_3/68_3_000.pdf', $result['full_pdf']);
        $this->assertSame('volumes/Volume 68_3/68_3_289.pdf', $result['toc_pdf']);
        $this->assertSame(['Tytgat Jan'], $result['articles'][0]['authors']);
        $this->assertSame('The Belgian Family Pharmacist', $result['articles'][1]['title']);
        $this->assertSame(['Hendrik De Rocker', 'Jan Saevels'], $result['articles'][1]['authors']);
    }

    public function test_numbered_entries_from_early_volumes(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Full Issue [<a href="http://bulletin.mfd.org.mk/volumes/Volume 47/Volume_47.pdf">PDF</a>]</p>
            <p>1. K. Goracinova, K. Mladenovska<br />
            <em>Midazolam-sirupus, formulation and pharmacodynamic efficacy </em>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 47/47_001.pdf">PDF</a>]<em><br />
            </em></p>
            HTML);

        $this->assertSame('volumes/Volume 47/Volume_47.pdf', $result['full_pdf']);
        $this->assertSame(['K. Goracinova', 'K. Mladenovska'], $result['articles'][0]['authors']);
        $this->assertSame('Midazolam-sirupus, formulation and pharmacodynamic efficacy', $result['articles'][0]['title']);
    }

    public function test_title_wrapped_with_a_line_break_is_joined(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Hristijan Kostov, Elena Kostova<br />
            <strong>Plasma levels of C-reactive protein in patients with<br />
            operative treated fractures </strong>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 70_1/70_1_001.pdf">PDF</a>]<br />
            <strong>Early on-line  2 October 2024</strong></p>
            HTML);

        $this->assertSame('Plasma levels of C-reactive protein in patients with operative treated fractures', $result['articles'][0]['title']);
        $this->assertSame(['Hristijan Kostov', 'Elena Kostova'], $result['articles'][0]['authors']);
    }

    public function test_bold_authors_are_not_merged_into_an_italic_title(): void
    {
        $result = $this->parse(<<<'HTML'
            <p><strong><em>Macedonian Pharmaceutical Bulletin, 72 (Suppl 1), 2026 [<a href="http://bulletin.mfd.org.mk/volumes/Volume 72_3/72_3_000.pdf">PDF</a>]</em></strong></p>
            <p><strong>Borut Božič</strong></p>
            <p><em>Agile pharmacy curricula for a sustainable profession [<a href="http://bulletin.mfd.org.mk/volumes/Volume 72_3/72_3_001.pdf">PDF</a>]</em></p>
            HTML);

        $this->assertSame('volumes/Volume 72_3/72_3_000.pdf', $result['full_pdf']);
        $this->assertSame(['Borut Božič'], $result['articles'][0]['authors']);
        $this->assertSame('Agile pharmacy curricula for a sustainable profession', $result['articles'][0]['title']);
    }

    public function test_authors_and_title_on_one_line_are_split_by_style(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Nada Majkić-Singh<br />
            <em><strong>The Medical Biochemistry </strong></em>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 66_3/66_3_001.pdf">PDF</a>]</p>
            <p>Biljana Lazarova, Biljana Eftimova <em><strong>Evaluation of antibiotic consumption</strong></em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 66_3/66_3_038.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame(['Biljana Lazarova', 'Biljana Eftimova'], $result['articles'][1]['authors']);
        $this->assertSame('Evaluation of antibiotic consumption', $result['articles'][1]['title']);
    }

    public function test_titles_keep_curly_quotes_and_names_lose_affiliation_marks(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Sonja Kuzmanovska, Bujar Qazimi<sup>1</sup><br />
            <em>“In-house” preparation of 99mTc-EDDA </em>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 57/57_007.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame('“In-house” preparation of 99mTc-EDDA', $result['articles'][0]['title']);
        $this->assertSame(['Sonja Kuzmanovska', 'Bujar Qazimi'], $result['articles'][0]['authors']);
    }

    public function test_latin_words_typed_with_cyrillic_letters_are_normalised(): void
    {
        // "Таtјаnа" and "Toxicоlogical" contain Cyrillic Т, а, ј and о.
        $result = $this->parse(<<<'HTML'
            <p>Таtјаnа Kadifkova Panovska<br />
            <em>Toxicоlogical evaluation</em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 60/60_002.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame(['Tatjana Kadifkova Panovska'], $result['articles'][0]['authors']);
        $this->assertSame('Toxicological evaluation', $result['articles'][0]['title']);
    }

    public function test_issue_heading_line_is_not_taken_as_authors(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Volume 64 (2)</p>
            <p>Katerina Cvetkovska, Biljana Bauer<br />
            <em>Ethnopharmacological review of Cydonia oblonga M.</em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 64_2/64_2_001.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame(['Katerina Cvetkovska', 'Biljana Bauer'], $result['articles'][0]['authors']);
    }

    public function test_same_number_in_different_folders_is_kept(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>A. Author<br /><strong>First</strong> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 72_1/72_1_001.pdf">PDF</a>]</p>
            <p>B. Author<br /><strong>Second</strong> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 72_2/72_2_001.pdf">PDF</a>]</p>
            HTML);

        $this->assertCount(2, $result['articles']);
        $this->assertSame([], $result['warnings']);
    }

    public function test_available_online_dates_are_not_taken_as_authors(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Ljubica Adji Andov, Marija Karapandzova<br />
            <em>Antioxidative potential of Chenopodium</em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 61_2/61_2_001.pdf">PDF</a>]<br />
            Available on-line 14 March 2016</p>
            <p>Svetlana Kulevanova<br />
            <em>Second article</em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 61_2/61_2_002.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame('2016-03-14', $result['articles'][0]['online_at']);
        $this->assertSame(['Svetlana Kulevanova'], $result['articles'][1]['authors']);
    }

    public function test_rich_titles_keep_superscripts_subscripts_and_short_italics(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Marija Sterjova, Dushko Shalabalija<sup>1</sup><br />
            <strong>Ase</strong><strong>ptic process validation of [<sup>18</sup>F]Sodium Fluoride radiopharmaceutical</strong><em><strong> </strong></em>[<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_1/68_1_004.pdf">PDF</a>]</p>
            <p>Arijeta Shabani<br />
            <strong>Classification of <em>Cannabis sativa </em>L<em>.</em> variety Helena</strong> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_1/68_1_005.pdf">PDF</a>]</p>
            <p>Ana Poceva<br />
            <em><strong>Pattern of benzodiazepine use among death cases</strong></em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 68_1/68_1_006.pdf">PDF</a>]</p>
            HTML);

        [$isotope, $species, $styled] = $result['articles'];

        $this->assertSame('Aseptic process validation of [18F]Sodium Fluoride radiopharmaceutical', $isotope['title']);
        $this->assertSame('Aseptic process validation of [<sup>18</sup>F]Sodium Fluoride radiopharmaceutical', $isotope['title_html']);
        // Affiliation marks next to names stay out of the author list.
        $this->assertSame(['Marija Sterjova', 'Dushko Shalabalija'], $isotope['authors']);

        $this->assertSame('Classification of Cannabis sativa L. variety Helena', $species['title']);
        $this->assertSame('Classification of <i>Cannabis sativa</i> L. variety Helena', $species['title_html']);

        // A title set wholly in italics is the post's style, not markup.
        $this->assertNull($styled['title_html']);
    }

    public function test_issue_cover_page_and_issue_online_date(): void
    {
        $result = $this->parse(<<<'HTML'
            <p>Volume 62 (2)<br />
            <strong>Available on-line 03 November 2017. </strong></p>
            <p>Full Issue [<a href="http://bulletin.mfd.org.mk/volumes/Volume 62_2/Volume_62_2.pdf">PDF</a>] [<a href="http://bulletin.mfd.org.mk/volumes/Volume 62_2/62_2_cover.pdf">Cover Page</a>]</p>
            <p>Nadica Sibinovska, Venera Komoni<br />
            <em>Novel approaches in treatment of Acne vulgaris</em> [<a href="http://bulletin.mfd.org.mk/volumes/Volume 62_2/62_2_003.pdf">PDF</a>]</p>
            HTML);

        $this->assertSame('volumes/Volume 62_2/Volume_62_2.pdf', $result['full_pdf']);
        $this->assertSame('volumes/Volume 62_2/62_2_cover.pdf', $result['cover_pdf']);
        $this->assertSame('2017-11-03', $result['online_at']);
        $this->assertCount(1, $result['articles']);
        $this->assertNull($result['articles'][0]['online_at']);
    }
}
