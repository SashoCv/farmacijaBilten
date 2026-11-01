<?php

namespace Tests\Unit;

use App\Journal\Import\PdfMetadataExtractor;
use PHPUnit\Framework\TestCase;

/**
 * Fixtures are pdftotext output (plain and -layout) of real first pages.
 */
class PdfMetadataExtractorTest extends TestCase
{
    private const RAW = <<<'TXT'
        Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)
        ISSN: 1857-8969
        DOI: 10.33320/maced.pharm.bull.2025.71.02.001
        Review paper

        Analytical methods for determination of sugar content in
        fruit juices
        Redzep Ali1*, Oliver Majstorov1, Tanja Petreska Ivanovska2,
        Lidija Petrushevska-Tozi2
        1

        Center for Public Health of the Republic of Macedonia, St.50 Division No.6,
        1000 Skopje, Republic of North Macedonia
        2
        Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje, Mother Tereza 47,
        1000 Skopje, Republic of North Macedonia
        Received: February 2025; Accepted: April 2025

        Abstract
        TXT;

    private const LAYOUT = <<<'TXT'
                                                    Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)
        Abstract

             The determination and quantification of sugars in fruit juices is especially important for quality con-
        trol. In this article, the analytical methods are presented and discussed.
             Spectroscopic techniques have been recognized as valuable alternatives.

        Key words: sugars, fruit juices, classical methods, chromatography,
        spectroscopy

        Introduction                                          commonly classified as simple sugars
        TXT;

    public function test_reads_header_abstract_keywords_and_affiliations(): void
    {
        $data = (new PdfMetadataExtractor)->parse(self::RAW, self::LAYOUT);

        $this->assertSame('3–11', $data['pages']);
        $this->assertSame('10.33320/maced.pharm.bull.2025.71.02.001', $data['doi']);
        $this->assertSame('Review paper', $data['type']);
        $this->assertSame('Received: February 2025; Accepted: April 2025', $data['history']);
        $this->assertSame(
            "The determination and quantification of sugars in fruit juices is especially important for quality control. In this article, the analytical methods are presented and discussed.\n\nSpectroscopic techniques have been recognized as valuable alternatives.",
            $data['abstract'],
        );
        $this->assertSame(['sugars', 'fruit juices', 'classical methods', 'chromatography', 'spectroscopy'], $data['keywords']);
        $this->assertSame([
            'Center for Public Health of the Republic of Macedonia, St.50 Division No.6, 1000 Skopje, Republic of North Macedonia',
            'Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje, Mother Tereza 47, 1000 Skopje, Republic of North Macedonia',
        ], $data['affiliations']);
    }

    public function test_reads_author_names_under_the_title(): void
    {
        $authors = (new PdfMetadataExtractor)->authors(self::RAW, 'Analytical methods for determination of sugar content in fruit juices');

        $this->assertSame(['Redzep Ali', 'Oliver Majstorov', 'Tanja Petreska Ivanovska', 'Lidija Petrushevska-Tozi'], $authors);
        $this->assertTrue(PdfMetadataExtractor::looksLikeNames($authors));
    }

    public function test_affiliation_marks_split_names_when_a_comma_is_missing(): void
    {
        $raw = "Short communication\nDecarboxylation of cannabis\nDejan Mihajlovski1*, Elena Trajanovska Donev1\nIrena Slaveska Spirevska2\n1\nAlkaloid AD Skopje\n";

        $this->assertSame(
            ['Dejan Mihajlovski', 'Elena Trajanovska Donev', 'Irena Slaveska Spirevska'],
            (new PdfMetadataExtractor)->authors($raw, 'Decarboxylation of cannabis'),
        );
    }

    public function test_company_lines_are_not_accepted_as_names(): void
    {
        $this->assertFalse(PdfMetadataExtractor::looksLikeNames(['Ana Ivceska', 'Alkaloid AD Skopje']));
        $this->assertFalse(PdfMetadataExtractor::looksLikeNames(['Bionika Pharmaceuticals']));
    }

    public function test_macedonian_font_text_is_converted_to_cyrillic(): void
    {
        $this->assertSame('Клучни зборови: нефротоксичност', PdfMetadataExtractor::macFontToCyrillic('Klu~ni zborovi: nefrotoksi~nost'));
    }

    public function test_old_macedonian_latin_paper_with_yuscii_and_primen_line(): void
    {
        $raw = <<<'TXT'
            Macedonian pharmaceutical bulletin, 52, (1,2) 25-32 (2006)
            ISSN 1409 - 8695
            UDC: 615.27:616.61-097.3
            Stru~en trud
            Efekti na amifostin vo prevencija na nefrotoksi~nost
            Dim~e Zafirov1, Krume Ja}ovski1, Petar Milo{evski2
            1Institut za pretklini~ka i klini~ka farmakologija so toksikologija,
            Medicinski fakultet, Skopje, R. Makedonija
            2Univerzitet vo Pri{tina, Kosovo
            Primen april 2006, prifaten juni 2006
            Apstarkt
            TXT;

        $data = (new PdfMetadataExtractor)->parse($raw, $raw);

        $this->assertSame('Professional paper', $data['type']);
        $this->assertSame('Received: April 2006; Accepted: June 2006', $data['history']);
        $this->assertSame([
            'Institut za pretklinička i klinička farmakologija so toksikologija, Medicinski fakultet, Skopje, R. Makedonija',
            'Univerzitet vo Priština, Kosovo',
        ], $data['affiliations']);
    }

    public function test_english_abstract_under_a_macedonian_heading_stays_latin(): void
    {
        $layout = <<<'TXT'
            Apstrakt
                 Liposome dispersions and liposome gel formulations for topical administration were evaluated as
            modified release delivery systems for 5-fluorouracil. The drug was entrapped in the internal phase.

            Key words: liposomes, hydration conditions

            Introduction
            TXT;

        $data = (new PdfMetadataExtractor)->parse($layout, $layout);

        $this->assertStringStartsWith('Liposome dispersions and liposome gel formulations', (string) $data['abstract']);
        $this->assertSame(['liposomes', 'hydration conditions'], $data['keywords']);
    }

    public function test_only_the_journals_own_doi_is_taken(): void
    {
        $raw = "Macedonian pharmaceutical bulletin, 61 (2) 21 - 28 (2015)\nOriginal scientific paper\nSee also doi:10.1371/journal.pone.0068431\n";

        $this->assertNull((new PdfMetadataExtractor)->parse($raw, $raw)['doi']);
    }
}
