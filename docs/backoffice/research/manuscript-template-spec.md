# Manuscript template specification for the Macedonian Pharmaceutical Bulletin

**Sources read.** I looked at all 10 pages of `/Users/sasho/Downloads/71_2_001.pdf` (Review paper), using `pdftotext`, `pdffonts`, PNG renders and PyMuPDF to measure each text span and rule. I read the DB pages `guidelines/instructions-for-authors` (id 11), `article-processing-charges` (id 3), `review-policies` (id 5), `editorial-policies` (id 7), `aims-and-scope` (id 4) and `downloads` (id 1). For comparison I used two Original scientific papers: `Volume 73_1/73_1_001.pdf` (tables, display formula, italics) and `Volume 71_2/71_2_008.pdf` (figures, merged-cell tables, 10 tables). I also checked display equations in `Volume 71_1/71_1_007.pdf` and `Volume 70_2/70_2_002.pdf`, Macedonian-language labels in `Volume 56/56_008.pdf` and `Volume 56/56_009.pdf`, and section headings in every article of 71_2, 72_1, 72_2 and 73_1.

PNG renders are in `/private/tmp/claude-501/-Users-sasho-Sites-bilten-farmacija/b10b14ec-840a-4cda-9435-5b2c15385047/scratchpad/tplresearch/` (`pg-*.png` is the template, `b-*.png` is 73_1_001, `c-*.png` is 71_2_008, and `a.txt`/`b.txt`/`c.txt` are the layout text).

**Conventions used below.**

- **IFA** means the Instructions for Authors page (DB id 11). Quotes are verbatim.
- **PDF** means what the published PDFs actually do.
- **[CONFIRM]** marks a fact the editors must confirm. It belongs in `config/journal.php`, not in code.
- All sizes are in PostScript points (pt). 1 mm = 2.835 pt.

---

## (a) Metadata the author fills in, with validation rules

### A1. Article-level fields

| Field                                                                        | Required                                                       | Validation / notes                                                                                                                                                                                           | Source                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `article_type`                                                               | yes                                                            | Enum, printed as the label (English / Macedonian), see the type table below.                                                                                                                                 | IFA "Types of paper" + PDF labels                                                                                                                                                                                                                                                                                                          |
| `language`                                                                   | yes                                                            | `en` or `mk`. `mk` is allowed only for `professional_paper` and "other contributions".                                                                                                                       | IFA: "Original scientific papers, short communications, reviews and mini-reviews should be written in good English (American or British usage is accepted, but not a mixture of these), while professional papers and all other contributions may be submitted in Macedonian."                                                             |
| `title` (in manuscript language)                                             | yes                                                            | Rich inline text: italic, sub, sup, Greek. Sentence case, no final period. Warn when it contains abbreviations or formulae. Suggested max 250 chars [CONFIRM].                                               | IFA: "Concise and informative. Avoid abbreviations and formulae where possible." PDF titles are sentence case, e.g. "Cholinesterase inhibitory activity and neuronal cytotoxicity of cannabidiol and Δ9-tetrahydrocannabinol: an _in vitro_ study" (with _in vitro_ in bold italic).                                                       |
| `running_title`                                                              | optional                                                       | Max 80 chars, plain text. Used for the odd-page running head. If empty, the title is cut at a word boundary to fit one line and "…" is added.                                                                | PDF: "Analytical methods for determination of sugar content in fruit juices: from classical…" (86 chars), "Cholinesterase inhibitory activity and neuronal cytotoxicity of cannabidiol and…"                                                                                                                                               |
| `title_summary` (the other language: mk for an en paper, en for an mk paper) | yes                                                            | Same rules as `title`.                                                                                                                                                                                       | IFA: "Manuscripts written in English should contain a Summary in Macedonian at the end of the paper… Professional papers written in Macedonian should contain a summary in English"                                                                                                                                                        |
| `abstract`                                                                   | yes                                                            | Rich text, one or more paragraphs, **no tables or figures**. Word limit by type (see A3). Warn on citations. If a citation is used it must be author-year **and** must appear in full in the reference list. | IFA: "Each paper must begin with an Abstract which should not exceed more than 250 (original scientific and professional papers) or 100 (short communications) words… References should be avoided, but if essential, then cite the author(s) and year(s)."                                                                                |
| `keywords`                                                                   | yes                                                            | **3–6** entries, ordered by importance. Each is plain text up to about 60 chars, lowercase unless a proper noun or abbreviation. Printed joined with ", ".                                                   | IFA: "a list of 3 to 6 keywords arranged in the order according to their importance". PDF: "Key words: sugars, fruit juices, classical methods, chromatography, spectroscopy"                                                                                                                                                              |
| `abstract_summary` + `keywords_summary` (the other language)                 | yes                                                            | The same limits as the main abstract and keywords [CONFIRM: the IFA gives no limit for the summary].                                                                                                         | IFA: "The summary should contain: title, author(s) full-name(s), surname(s), author's affiliations (institution and address), key words and abstract."                                                                                                                                                                                     |
| `abbreviations`                                                              | optional                                                       | List of abbreviation → definition pairs. Printed as a first-page footnote (see conflict in (i)).                                                                                                             | IFA: "Define abbreviations that are not standard in this field in a footnote to be placed on the first page of the article."                                                                                                                                                                                                               |
| `acknowledgements`                                                           | optional                                                       | Rich text. Must not be placed in the title or footnotes.                                                                                                                                                     | IFA "Acknowledgements"                                                                                                                                                                                                                                                                                                                     |
| `conflict_of_interest`                                                       | required by the editorial policy [CONFIRM where it is printed] | Text; default "The authors declare no conflict of interest." [CONFIRM wording]                                                                                                                               | Editorial policies: "All authors should disclose in their manuscript any financial or other substantive conflict of interest… All sources of financial support for the project should be disclosed." No sampled PDF prints it.                                                                                                             |
| `funding`                                                                    | required by the editorial policy [CONFIRM]                     | Text.                                                                                                                                                                                                        | Same as above.                                                                                                                                                                                                                                                                                                                             |
| `ethics_statement`                                                           | required when humans or animals are involved                   | Checkbox ("involves humans" / "involves animals") plus text with the committee name and approval number.                                                                                                     | IFA: experiments involving humans must follow "The Code of Ethics of the World Medical Association (Declaration of Helsinki)", animal experiments "EC Directive 86/609/EEC" [CONFIRM: superseded by 2010/63/EU, but do not change the journal text without the editors], and "This must be stated at an appropriate point in the article." |
| `suggested_referees`                                                         | yes, 3 [CONFIRM if this becomes optional]                      | Exactly 3 entries, each name + full address + e-mail (validated). Visible only to admins.                                                                                                                    | IFA: "Please submit, with the manuscript, the names, addresses and e-mail addresses of 3 potential referees. Note that the editor retains the sole right to decide whether or not the suggested reviewers are used."                                                                                                                       |
| `declarations`                                                               | yes, every box ticked                                          | Not published elsewhere / not under consideration; approved by all authors; permission obtained for copyrighted material; spell- and grammar-checked; all references cited and all citations listed.         | IFA "Submission declaration" and "Submission checklist"                                                                                                                                                                                                                                                                                    |
| `forms`                                                                      | [CONFIRM required]                                             | Uploads: "Author Disclosure Form" and "Ethical Responsibility Form" (MS Word downloads on the old site).                                                                                                     | DB page id 1                                                                                                                                                                                                                                                                                                                               |
| `apc_acknowledged`                                                           | yes                                                            | Checkbox with the amount from `config('journal.apc')`, currently 50 EUR "on acceptance" [CONFIRM: DOAJ says no APC].                                                                                         | DB page id 3: "charges article processing fee of 50 EUR"                                                                                                                                                                                                                                                                                   |
| `invited`                                                                    | only for review / mini-review                                  | Checkbox "Invited by the Editorial Board" [CONFIRM: is this enforced?].                                                                                                                                      | IFA: "Reviews and mini-reviews are written at the invitation of the Editorial Board."                                                                                                                                                                                                                                                      |

**Fields set by the system or admin (not the author):**

- `received_at` (the submit date) and `accepted_at`. Printed as month and year: `Received: February 2025; Accepted: April 2025`.
- `volume`, `issue`, `first_page`, `last_page`, `year`.
- `doi`, using the pattern `10.33320/maced.pharm.bull.{YYYY}.{VV}.{II}.{NNN}`, e.g. `10.33320/maced.pharm.bull.2025.71.02.001` and `…2027.73.01.001`. The issue has 2 digits and the article number has 3.

### A2. Authors and affiliations

**Authors** (ordered list, at least 1):

- `given_names` and `family_name` are separate fields. The IFA says: "Where the family name may be ambiguous (e.g., a double name), please indicate this clearly". Separate fields solve this, and the running head is built from them.
- Name in the other script, for the Summary. Required, because the PDF prints "Доника Хоџа¹, Оливер Тусевски²…" in the Резиме.
- `affiliation_ids`: at least 1, referring to the affiliation list.
- `is_corresponding`: at least one author. More than one is allowed: 71_2_008 marks two authors with `*`.
- E-mail is required for corresponding authors and optional for others.
- Phone is required for corresponding authors. Fax is optional. The IFA says "Ensure that telephone and fax numbers (with country and area code) are provided in addition to the e-mail address and the complete postal address."
- ORCID is optional and validated as `0000-0000-0000-000X` (not in the IFA, but standard).

**Affiliations** (ordered list, numbered 1..n in order of first use):

- Fields: organisation (department / faculty / university), street, postal code, city and country, all required.
- Each affiliation also needs a version in the other language for the Summary.
- IFA: "Indicate all affiliations with a lower-case superscript arabic number immediately after the author's name and in front of the appropriate address. Provide the full postal address of each affiliation, including the country name of each author."

**Printed markers:**

- Author: `Redzep Ali1*` printed as "Redzep Ali" followed by the superscript "1*". The `*` comes after the number.
- Affiliation: superscript number directly in front of the address: "¹Center for Public Health of the Republic of Macedonia, St.50 Division No.6, 1000 Skopje, Republic of North Macedonia".
- If there is only one affiliation, print numbers anyway for consistency [CONFIRM].

### A3. Article types and limits

| Key                          | Printed label EN                                      | Printed label MK                 | Abstract limit                         | Other limits                                                                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------- | -------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `original_scientific_paper`  | Original scientific paper                             | Оригинален научен труд [CONFIRM] | 250 words                              | none stated                                                                                                                                                                                                                              |
| `short_communication`        | Short communication                                   | Кратко соопштение [CONFIRM]      | 100 words                              | "the number of pages should not exceed 10 (including 2 illustrations, figures or tables)". Enforce at most 2 tables + figures combined and at most 10 rendered pages. "An Abstract should be included as well as a full reference list." |
| `review_paper`               | Review paper                                          | Прегледен труд [CONFIRM]         | **not stated** [CONFIRM]. Suggest 250. | Invited. The IFA says "competency of the authors of the reviews being assured by their own published results".                                                                                                                           |
| `mini_review`                | Mini-review [CONFIRM: no sampled PDF uses this label] | [CONFIRM]                        | as review                              | as review                                                                                                                                                                                                                                |
| `professional_paper`         | Professional paper                                    | Стручен труд (from 56_008)       | 250 words                              | may be in Macedonian                                                                                                                                                                                                                     |
| `case_study` / `case_report` | Case study / Case report                              | [CONFIRM]                        | [CONFIRM]                              | **Not in the IFA**, but appears in published issues (3 + 1 PDFs) [CONFIRM if offered]                                                                                                                                                    |

Observed abstract lengths in volumes 71–73 range from 119 to 313 words. 73_1_001 has 313 words, which is over the 250 limit, so make the limits a configurable soft warning or a hard block [CONFIRM].

---

## (b) Sections by article type (fixed skeleton, order, nesting)

**Front matter, all types (generated from metadata; not editable as sections):**
journal block → title → authors → affiliations → Received/Accepted → rule → **Abstract** → **Key words** → rule.

### B1. Original scientific paper, short communication, professional paper

IFA: "Manuscript should contain: title, abstract, key words, introduction, material and methods, results and discussion, conclusion, acknowledgment (if desired) references and summary."

| #   | Section (printed heading)               | Required          | Notes                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `Introduction`                          | yes               | IFA: "State the objectives of the work and provide an adequate background, avoiding a detailed literature survey or a summary of the results."                                                                                                                                             |
| 2   | `Material and methods`                  | yes               | IFA spelling. PDFs use both "Material and methods" and "Materials and methods", so offer a toggle that defaults to the IFA spelling [CONFIRM]. Theoretical papers replace this section with `Theoretical background` (IFA). 72_2_002 used `Experimental`; allow it as a variant [CONFIRM]. |
| 3a  | `Results and discussion`                | yes (default)     | IFA: "A combined Results and Discussion section is often appropriate." Case: "Results and discussion" (lowercase d) in most PDFs, "Results and Discussion" in 72_1_003 and 72_2_003. Normalise to sentence case.                                                                           |
| 3b  | `Results` + `Discussion`                | alternative to 3a | Author picks combined or separate.                                                                                                                                                                                                                                                         |
| 4   | `Conclusion`                            | yes               | IFA heading is "Conclusions". **Every** sampled PDF prints "Conclusion". The IFA says it "may stand alone or form a subsection of a Discussion or Results and Discussion section". Allow it as a level-2 heading inside 3a/3b instead of a top-level section.                              |
| 5   | `Acknowledgement` / `Acknowledgements`  | optional          | Must sit "at the end of the article before the references". PDFs use both spellings; normalise [CONFIRM].                                                                                                                                                                                  |
| 6   | `Conflict of interest` / `Funding`      | [CONFIRM]         | Required by the editorial policy but never printed so far. Suggest a short unnumbered block after Acknowledgements.                                                                                                                                                                        |
| 7   | `References`                            | yes               | Generated from the structured reference list, not edited as free text.                                                                                                                                                                                                                     |
| 8   | Appendices `Appendix A`, `Appendix B`   | optional          | IFA: equations "Eq. (A.1)", "Table A.1; Fig. A.1". Placement after References or before it [CONFIRM]. Suggest before References.                                                                                                                                                           |
| 9   | `Резиме` (or `Summary` for an mk paper) | yes               | Generated from the summary metadata.                                                                                                                                                                                                                                                       |

Short communication: same skeleton and the same headings (IFA: "prepared as described for full length manuscripts").

### B2. Review paper / mini-review

`Introduction` (required) → **1..n free author-titled sections** (required; e.g. "Sample preparation for sugar analysis", "Classical methods for sugar analysis") → `Conclusion` (required; all reviews in 71_2, 72_1 and 72_2 have it) → `Acknowledgements` (optional) → `References` → `Резиме`.

71_2_001 actually uses only level-2 italic headings below `Introduction`. Allow level 1 and level 2 freely.

### B3. Macedonian-language manuscripts

Labels quoted from 56_008 and 56_009 (2010):

- `Апстракт`
- `Клучни зборови:`
- `Вовед`
- `Заклучок`
- `Литература`
- `Табела 1.`
- `Слика 2.`
- `Summary`
- `Key words:`

Labels **not** observed (all [CONFIRM]): "Материјал и методи", "Резултати и дискусија", "Благодарност", "Received/Accepted" (e.g. "Примено: …; Прифатено: …").

Store every printed label in `lang/` or config, keyed by language.

### B4. Heading levels and nesting rules for the editor

- **Two levels only.** Level 1 is the section and Level 2 the subsection. Every sampled PDF (71_2_001, 73_1_001, 71_2_008, all of 71_2–73_1) uses only these two.
- Headings are **unnumbered**. Old 2010 Macedonian papers used "1. Вовед", but the current style is unnumbered.
- IFA: "Each heading should appear on its own separate line." No run-in headings.
- A Level 2 heading may appear only inside a Level 1 section.
- Fixed Level 1 headings come from the skeleton. Authors may **not** add extra Level 1 headings to original or short papers [CONFIRM]. They may add them freely in reviews.
- Allowed blocks inside a section: paragraph, Level 2 heading, table, figure, display equation, bulleted or numbered list (rare; allow but do not encourage).

---

## (c) Inline formatting the editor must support

**Marks:**

- **bold**: rare in body text; used only in front matter and labels.
- _italic_: species, Latin terms, variables.
- subscript and superscript.
- Nothing else. Do not offer underline, colour, font, size, alignment or manual spacing. IFA: "Most formatting codes will be removed… do use bold face, italics, subscripts, superscripts etc."

**Italic, observed:**

- Species: "_Cannabis sativa_", "_Allium cepa_ L." (the authority "L." stays roman), "_Ipomoea batatas_".
- Latin: "_in vitro_". Note that "per se" is printed roman.
- Statistical variables: "_p_ < 0.05", "*R*²". "n = 3" is printed roman: italicise _n_ per the IFA rule [CONFIRM].
- Concentration notation: "_v/v_".
- IFA: "In principle, variables are to be presented in italics."

**Subscript and superscript, observed:**

- "Na₂S₂O₃", "KMnO₄", "H₂O₂", "IC₅₀", "IC₂₅", "FH₂O₂"
- "1×10⁴ cells", "*R*²=0.999", "NADH/NAD+", "Cu(II)"
- "Δ9-tetrahydrocannabinol". The PDF uses a plain "9"; offer superscript "Δ⁹" [CONFIRM].
- Store these as real `<sub>` and `<sup>` marks, not Unicode sub/superscript digits, so the PDF and search stay consistent.

**Symbol palette** (an "Insert symbol" button; all of these appear in the PDFs):

- Greek: α β γ δ Δ κ λ µ (micro, U+00B5) π σ Σ χ
- Operators: ± × − (true minus U+2212) – (en dash for ranges: "62.5–2000 µg/mL", "pp. 249–268") ≤ ≥ < > ≈ ~ → √ ∑ · ‰
- °, with the unit form "37 °C" (space before °C)
- Typographic quotes ’ “ ” „ (the Macedonian opening quote „)
- Fractions with the solidus "/": IFA "use the solidus (/) instead of a horizontal line for small fractional terms, e.g., X/Y"

**Units and numbers:**

- SI units with a space between number and unit: "25 g", "210 nm", "1.5 mL/min", "µg/mL".
- IFA: "use the international system of units (SI). If other units are mentioned, please give their equivalent in SI. The names of substances should be in accordance with the IUPAC recommendations".
- Decimal point in English text and decimal comma in Macedonian text. The 73_1_001 Резиме uses "62,5–2000 µg/mL" and "182,66". This is not stated in the IFA [CONFIRM]. Note that 71_1_007, an English paper, uses "0,0585", which is inconsistent.

**Inline objects:**

- **Citations**: author-year, inserted from the reference list as a structured node, see (g).
- **Cross-references**: "Table 1", "(Fig. 1)", "Fig. 2a", "Eq. (1)". Auto-numbered nodes, so numbers update when items move.
- **Footnote**: IFA "Footnotes should be used sparingly. Number them consecutively throughout the article, using superscript Arabic numbers… Do not include footnotes in the Reference list." Printed at the page bottom below a short rule.
- **Inline math**: optional LaTeX. Simple cases are better as text plus sub/sup.

**Editor quality checks (warnings):**

- Abbreviation defined at first use.
- Each cited reference present in the list, and each listed reference cited (IFA: "Please ensure that every reference cited in the text is also present in the reference list (and vice versa)").
- Two-author citations use "and", not "&".

---

## (d) Table specification

Measured on 71_2_001 (Table 1 on p. 5, Table 2 on p. 6) and 73_1_001 (Tables 1–4); merged cells checked in 71_2_008.

| Property                  | Rule                                                                                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbering                 | Arabic, consecutive by **first mention in the text**; appendix tables "Table A.1"                                                                                                                                                                                                                                                             | IFA: "numbered in Arabic numerals (e.g. Table 1)… Number tables consecutively in accordance with their appearance in the text."                                                                                                                                                     |
| Caption position          | **Above** the table                                                                                                                                                                                                                                                                                                                           | All PDFs                                                                                                                                                                                                                                                                            |
| Caption format            | `Table 1.` in regular weight (not bold), then a gap, then the caption text. Left-aligned to the table block with a **hanging indent**: wrapped lines align with the start of the text, about 43 pt (15 mm) from the label start. Caption text in sentence case, **no final period** (normalise; 71_2_008 Table 5 has one). Size 10 pt (9.96). | "Table 1. Characteristics of methods for sugar analysis based on reducing properties of monosaccharides"; "Table 2. Examples of the application of chromatographic and spectroscopic techniques in the analysis of sugars in fruit juices"                                          |
| Caption description       | Allowed after the title as extra sentences, may contain italic                                                                                                                                                                                                                                                                                | 73_1_001: "Table 1. AChE IC₅₀ values (µg/mL) for CBD, THC, and eserine. Values are mean ± SD (n = 3). Different letters denote statistically significant differences (_p_ < 0.05, Tukey's HSD)". The IFA checklist asks for "All tables (including title, description, footnotes)". |
| Rules (booktabs)          | **Top rule ≈1.5 pt** (Word draws two 0.48 pt lines about 1 pt apart). **Header rule 0.5 pt** (single). **Bottom rule ≈1.5 pt**. **No vertical rules, no row rules, no shading.**                                                                                                                                                              | Measured: 71_2_001 T1 top y 649.5/651.6/652.5, header y 666.0, bottom y 732.5/733.4/735.5. 73_1_001 T2 top y 90.0/91.0, header y 109.0, bottom y 162.0/163.0.                                                                                                                       |
| Group (spanning) rows     | Full-width row, text **centered**, thin 0.5 pt rule above and below                                                                                                                                                                                                                                                                           | 71_2_001 Table 2: "Chromatography" and "Spectroscopy" (rules at y 126.0/140.2 and 374.3/388.7)                                                                                                                                                                                      |
| Column-group headers      | A header cell spanning several columns (e.g. "NAT" over 3 columns, "PIO" over 3 columns) with a thin rule under the spanning header. Use a booktabs `cmidrule` style, trimmed at the ends.                                                                                                                                                    | 71_2_008 Table 1                                                                                                                                                                                                                                                                    |
| Merged cells              | **Yes**: colspan (headers, group rows) and rowspan (e.g. "Slope: 31.294", "Alkali stress of PIO HCl" spanning 2 rows, vertically centered)                                                                                                                                                                                                    | 71_2_008 Tables 1 and 10                                                                                                                                                                                                                                                            |
| Header row                | Regular weight by default (71_2_001 T2, 73_1_001, 71_2_008). 71_2_001 T1 uses **bold**. Make it a global setting, default regular [CONFIRM]. Header cells may wrap to 2 lines ("Analytical technique/ detector type", "Conc (µg/mL)").                                                                                                        | measured fonts                                                                                                                                                                                                                                                                      |
| Body text size            | 10 pt (9.96), same as the body. Allow 9 pt for wide tables.                                                                                                                                                                                                                                                                                   | measured                                                                                                                                                                                                                                                                            |
| Row spacing               | About 3 pt padding above and below each row; row pitch 14–18 pt. A cell that wraps keeps its row top-aligned.                                                                                                                                                                                                                                 | 73_1_001 rows at y 112.9 / 130.5 / 148.0                                                                                                                                                                                                                                            |
| Column alignment          | Per column: `left` / `center` / `right` (decimal optional). Stub (first) column always left. Default left for text. Numbers are left in 73_1_001 and centered in 71_2_008: default numeric columns to **center** [CONFIRM].                                                                                                                   |                                                                                                                                                                                                                                                                                     |
| Width                     | Natural width, at most the text-block width, **centered** on the text block. Observed widths 423–499 pt (149–176 mm).                                                                                                                                                                                                                         | 71_2_001 T1 76.9–500.0 pt, 73_1_001 76.9/62.8–514.2 pt                                                                                                                                                                                                                              |
| Table footnotes           | **Below the bottom rule**, 9 pt, left-aligned to the table's left edge, one per line. Markers: **superscript lowercase letters a, b, c**, both in the cell and in front of the note. Also allow a free "Abbreviations: …" note line.                                                                                                          | IFA: "Indicate each footnote in a table with a superscript lowercase letter… Place footnotes to tables below the table body". PDF 71_2_001 used "*" instead: "*A control process used in the sugar industry at continuous and semi-batch level." See (i).                           |
| Significance markers      | Allow `*`, `**`, `***` as a separate marker type for p-value conventions [CONFIRM]                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                     |
| Statistical-group letters | Plain cell content ("a", "b", "c"), not footnote markers                                                                                                                                                                                                                                                                                      | 73_1_001 "Statistical group" column                                                                                                                                                                                                                                                 |
| Placement                 | Block placed after the paragraph that first cites it. In the PDF it floats to the top or bottom of the page; allow a page-width float only (one column).                                                                                                                                                                                      |                                                                                                                                                                                                                                                                                     |
| Page breaks               | Long tables may break: repeat the header row and print "Table N. (continued)" [CONFIRM wording]. Never break inside a row.                                                                                                                                                                                                                    |                                                                                                                                                                                                                                                                                     |
| Very wide tables          | Optional landscape page [CONFIRM]                                                                                                                                                                                                                                                                                                             |                                                                                                                                                                                                                                                                                     |
| Forbidden                 | Images inside cells, colours, borders other than the four rule types above, empty spacer rows (71_2_001 T2 has some; strip them)                                                                                                                                                                                                              | IFA: "use only one grid for each individual table and not a grid for each row… Be sparing in the use of tables and ensure that the data presented in the tables are not duplicated elsewhere in the article."                                                                       |
| Inline content in cells   | Same marks as the body (italic, sub, sup, symbols), plus citations ("Zielinski et al., 2014" in a cell)                                                                                                                                                                                                                                       | 71_2_001 T2                                                                                                                                                                                                                                                                         |

---

## (e) Figure specification

| Property            | Rule                                                                                                                                                  | Evidence                                                                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbering           | `Fig. 1.`, Arabic, consecutive by first mention; appendix "Fig. A.1". In the text: "(Fig. 1)", "Fig. 2a", "(Table 9, Fig. 2a)".                       | IFA: "numbered in Arabic numerals (e.g. Fig. 1)". 71_2_008                                                                                                                                                                                                           |
| Caption position    | **Below** the image                                                                                                                                   | 71_2_008 p. 78 and p. 83                                                                                                                                                                                                                                             |
| Caption format      | `Fig. 1.` regular weight, gap, text, hanging indent like tables, 10 pt, no final period (normalise). Sub-panels described inline: "a) … ; b) …"       | "Fig. 1. Chromatogram of NAT and PIO." / "Fig. 2. a) Chromatogram of acid degradation of NAT & PIO; b) Chromatogram of basic degradation of NAT & PIO."                                                                                                              |
| Caption content     | Required: brief title + description, explaining all symbols and abbreviations used                                                                    | IFA: "Ensure that each illustration has a caption… A caption should comprise a brief title (not on the figure itself) and a description of the illustration. Keep text in the illustrations themselves to a minimum but explain all symbols and abbreviations used." |
| Structural formulae | Treated as figures ("Figures… and structural formulae")                                                                                               | IFA                                                                                                                                                                                                                                                                  |
| Panel labels        | Inside the image: "a)", "b)" (lowercase, bold in the image)                                                                                           | 71_2_008 Fig. 2                                                                                                                                                                                                                                                      |
| Size                | Width up to the text block, centered; author picks a width (25 / 50 / 75 / 100 % of text width); the original aspect ratio is kept                    |                                                                                                                                                                                                                                                                      |
| File formats        | PNG, JPEG, TIFF (converted), SVG or PDF for vector. Minimum 300 dpi at print size for photos, 600 dpi for line art. Max upload size [CONFIRM].        | Not in the IFA; production norm.                                                                                                                                                                                                                                     |
| Colour              | IFA: "Please submit the pictures in a black and white version." Recommendation: accept colour, warn that it must stay readable in greyscale [CONFIRM] |                                                                                                                                                                                                                                                                      |
| Alt text            | Required field (accessibility for the HTML version)                                                                                                   | not in the IFA                                                                                                                                                                                                                                                       |
| Placement           | Block after the citing paragraph; floats in the PDF                                                                                                   |                                                                                                                                                                                                                                                                      |

---

## (f) Equations

- **Inline:** simple formulae in the text line, using the solidus. Example from 73_1_001: "Y = 100 / (1 + (IC₅₀/X)^HillSlope)" and "[(FH₂O₂ − Fsample) / FH₂O₂] × 100".
- **Display:** its own centered line, with the number **"(1)" flush right** at the text-block edge, numbered consecutively. Seen in 71_1_007 "(1)…(13)" and 70_2_002 "(2)…(7)", where Word's equation editor rendered them with Cambria Math. A "where X is … and Y is …" paragraph follows and is **not** indented.
- **Appendix numbering:** "Eq. (A.1)", "Eq. (A.2)", then "Eq. (B.1)" in the next appendix (IFA).
- **In-text reference:** "Eq. (1)".
- **Typesetting:** variables italic; units, chemical symbols and function names upright.
- **Editor input:** LaTeX (KaTeX), with a live preview. Store the LaTeX source and render to MathML or SVG for the PDF and HTML.
- **Frequency:** equations are rare. They occur only in analytical and validation papers, and none in 71_2_001, 73_1_001 or 71_2_008 apart from inline formulae.

---

## (g) References and citations

### Style

The journal uses author-year Harvard, in the Elsevier "Harvard" style that the IFA examples copy verbatim from Elsevier's guide.

**Reference list:**

- Sorted alphabetically, then chronologically.
- Same author(s) in the same year gets "2014a", "2014b".
- IFA: "References should be arranged first alphabetically and then further sorted chronologically if necessary. More than one reference from the same author(s) in the same year must be identified by the letters "a", "b", "c", etc., placed after the year of publication."

**Grammar of an entry, as printed:**
`Surname, I.I., Surname, I., …, YEAR. Title in sentence case. Abbrev. Journal Volume(Issue), first–last. https://doi.org/…`

- **All** authors are listed. Abid et al. lists 7, Shokri et al. 8. There is no "et al." in the list.
- Initials have no spaces: "M.M.", "J.Á.".
- A comma comes before the year, and a period after the year.
- No italics anywhere in the reference list (checked in the PDF). The journal title is abbreviated per Index Medicus / ISSN LTWA / CAS (IFA "Journal abbreviations source").
- Use an en dash in page ranges. The PDFs mix "-" and "–"; normalise to "–".
- The DOI is a full `https://doi.org/` URL. The IFA examples have no DOI; the PDFs always add one.
- Web references: the IFA says "the full URL should be given and the date when the reference was last accessed".

**Real examples (verbatim, line breaks removed):**

1. Journal article (71_2_001):
   "Abid, M., Jabbar, S., Wu, T., Hashim, M.M., Hu, B., Lei, S., Zeng, X., 2014. Sonication enhances polyphenolic compounds, sugars, carotenoids and mineral elements of apple juice. Ultrason. Sonochem. 21(1), 93-97. https://doi.org/10.1016/j.ultsonch.2013.06.002"
2. Book chapter (71_2_001):
   "Cools, K., Terry, L.A., 2012. Extraction and quantification of sugars and fructans from vegetable matter. In: Preedy, V.R. (Ed.), Food and Nutritional Components in Focus No. 3 Dietary Sugars: Chemistry, Analysis, Function and Effects. The Royal Society of Chemistry, Cambridge, United Kingdom, pp. 249–268."
3. Legislation / web (71_2_001):
   "Directive 2012/12/EU of the European Parliament and of the Council of 19 April 2012 amending Council Directive 2001/112/EC relating to fruit juices and certain similar products intended for human consumption. Available at: http://data.europa.eu/eli/dir/2012/12/oj (accessed on 17.03.2025)."
4. Article number instead of pages (73_1_001):
   "Zhang, N., Chai, S., Wang, J., 2025. Assessing and projecting the global impacts of Alzheimer's disease. Front. Public Health 12, 1453489. https://doi.org/10.3389/fpubh.2024.1453489"

**IFA templates** (use them as test fixtures):

- "Van der Geer, J., Hanraads, J.A.J., Lupton, R.A., 2000. The art of writing a scientific article. J. Sci. Commun. 163, 51–59."
- "Strunk Jr., W., White, E.B., 1979. The Elements of Style, third ed. Macmillan, New York."
- "Mettam, G.R., Adams, L.B., 1999. How to prepare an electronic version of your article, in: Jones, B.S., Smith, R.Z. (Eds.), Introduction to the Electronic Age. E-Publishing Inc., New York, pp. 281–304."

### Implementation

- Store each reference as structured data (CSL-JSON): type, authors[], year, title, container-title (abbreviated), volume, issue, page, article-number, publisher, place, editors, edition, URL, accessed date, DOI.
- Offer **DOI lookup** (Crossref) and a "paste formatted reference" fallback.
- Render with an `elsevier-harvard`-like CSL. Customise it to: no italics; "In:" with a capital I (as the PDF does, while the IFA writes "in:") [CONFIRM]; and "Available at: URL (accessed on DD.MM.YYYY)".
- Allowed special values: "Unpublished results" and "Personal communication" in place of the date (IFA). "In press" requires an uploaded title page (IFA: "a copy of the title page of the relevant article must be submitted").

### In-text citations (from the PDFs)

| Case                        | Form                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| 1 author                    | "(Bicking, 2024)", "(WHO, 2015)"                                                      |
| 2 authors                   | "(Dasenaki and Thomaidis, 2019)", using "and", never "&"                              |
| 3+ authors                  | "(Tyagi et al., 2014)"                                                                |
| Group                       | "(Tyagi et al., 2014; Rajauria and Tiwari, 2018)", separated by "; "                  |
| Same authors, several years | "(Cammerlingo et al., 2007, 2018; Ilaslan et al, 2015)"                               |
| Narrative                   | "Puopolo et al. (2022)", "Zhang et al. (2024) showed", "Mooko et al. (2022) reported" |
| Document                    | "(Directive 2012/12/EU)"                                                              |

The IFA sets the order within a group: "Groups of references should be listed first alphabetically, then chronologically. Examples: "as demonstrated (Allan, 1996a, 1996b, 1999; Allan and Jones, 1995). Kramer et al. (2000) have recently shown….""

Generate the citation text from the reference data. Authors choose "parenthetical" or "narrative", and may add a page or prefix.

---

## (h) Page layout for the generated PDF (journal style, body in ONE column)

### H1. Measurements from the original (71_2_001; 73_1_001 and 71_2_008 are identical)

**Page and fonts:**

- Page **581.52 × 813.96 pt = 205.2 × 287.2 mm**. This is not A4 (A4 is 595.3 × 841.9 pt). Created with Microsoft Word 2019.
- Fonts: Times New Roman (TimesNewRomanPSMT, PS-ItalicMT, PS-BoldMT, PS-BoldItalicMT), all embedded as subsets.

**Text block:**

- About **499 pt (176 mm)** wide.
- Odd pages: left 48.1 pt (17.0 mm), right 34.3 pt (12.1 mm).
- Even pages: left 36.8 pt (13.0 mm), right 44.7 pt (15.8 mm).
- So the margins are mirrored: a wider inner margin on the spine side and a narrower outer one.
- Two columns of about 238 pt, with a gutter of about 24 pt (8.4 mm).

**Vertical positions:**

- Running head at top y = 42.6 pt (15.0 mm).
- Running-head rule at y = 53.9 pt (19.0 mm), **0.25 pt**, full text width.
- Body starts at y = 61.4 pt (21.7 mm).
- Last body line at about 748 pt.
- Footer at y = 757.9 pt (267.4 mm).

**Measured sizes** (actual values in brackets):

| Element                                                                            | Font / size                                                                                                                                                                                                                                                                      | Alignment & spacing                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journal line p.1: "_Macedonian pharmaceutical bulletin_, **71** (2) 3 - 11 (2025)" | 9.5 pt (9.48); journal name italic, volume bold                                                                                                                                                                                                                                  | right-aligned, line pitch 11.4 pt; starts y 65.6                                                                                                                                                                            |
| "ISSN: 1857-8969"                                                                  | 9.5 regular                                                                                                                                                                                                                                                                      | right                                                                                                                                                                                                                       |
| "DOI: 10.33320/maced.pharm.bull.2025.71.02.001"                                    | 9.5 regular                                                                                                                                                                                                                                                                      | right                                                                                                                                                                                                                       |
| Article type "_Review paper_" / "_Original scientific paper_"                      | 9.5 italic                                                                                                                                                                                                                                                                       | right                                                                                                                                                                                                                       |
| Title                                                                              | **18 pt bold**, sentence case                                                                                                                                                                                                                                                    | centered, line pitch about 20.7 pt, first line at about y 180 (about 80 pt below the type line)                                                                                                                             |
| Authors                                                                            | **14 pt regular**; superscripts 9 pt ("1*")                                                                                                                                                                                                                                      | centered, pitch 16.2 pt, about 50 pt below the title                                                                                                                                                                        |
| Affiliations                                                                       | **10 pt italic**; leading superscript number 6.5 pt italic                                                                                                                                                                                                                       | centered, pitch 11.5 pt, each its own block                                                                                                                                                                                 |
| "Received: February 2025; Accepted: April 2025"                                    | 9 pt regular                                                                                                                                                                                                                                                                     | centered, about 24 pt below affiliations                                                                                                                                                                                    |
| Rule                                                                               | 0.75 pt, full text width                                                                                                                                                                                                                                                         | about 21 pt below Received; another rule after Key words                                                                                                                                                                    |
| "Abstract"                                                                         | **11 pt bold**                                                                                                                                                                                                                                                                   | left, about 20 pt below the rule                                                                                                                                                                                            |
| Abstract text                                                                      | **9 pt**, leading about 10.7 pt                                                                                                                                                                                                                                                  | justified, first-line indent 17 pt (6 mm)                                                                                                                                                                                   |
| "**Key words:** sugars, …"                                                         | 9 pt; label bold                                                                                                                                                                                                                                                                 | left, about 12 pt below the abstract                                                                                                                                                                                        |
| Section heading (L1)                                                               | **11 pt bold**                                                                                                                                                                                                                                                                   | left, about 24 pt before, about 13 pt after                                                                                                                                                                                 |
| Subsection heading (L2)                                                            | **10 pt italic**                                                                                                                                                                                                                                                                 | left, about 12 pt before, about 6 pt after                                                                                                                                                                                  |
| Body                                                                               | **10 pt (9.96)**, leading 11.9 pt                                                                                                                                                                                                                                                | justified, **first-line indent 17 pt on every paragraph**, including the first after a heading; no paragraph spacing                                                                                                        |
| Table / figure caption                                                             | 10 pt regular; "Table 1." / "Fig. 1." not bold                                                                                                                                                                                                                                   | hanging indent about 43 pt                                                                                                                                                                                                  |
| Table body                                                                         | 10 pt; header regular or bold (see (d))                                                                                                                                                                                                                                          |                                                                                                                                                                                                                             |
| Table footnote                                                                     | 9 pt                                                                                                                                                                                                                                                                             | below the bottom rule                                                                                                                                                                                                       |
| Corresponding footnote, p.1 only                                                   | 10 pt: a line of underscores "__________________" (about 92 pt) then "*email: rexhepaliu@live.com"                                                                                                                                                                               | bottom of the first column, page 1                                                                                                                                                                                          |
| Running head, even pages                                                           | 9 pt regular; page number **10 pt italic** at the **outer (left)** edge                                                                                                                                                                                                          | "4 R. Ali, O. Majstorov, T. Petreska Ivanovska, Z. Zhivikj, R. Petkovska, L. Petrushevska-Tozi, L. Anastasova". **All** authors as initial(s) + surname, centered, wrapping to 2 centered lines when long (71_2_008 p. 78). |
| Running head, odd pages                                                            | 9 pt regular; page number 10 pt italic at the **outer (right)** edge                                                                                                                                                                                                             | short title centered, truncated with "…"                                                                                                                                                                                    |
| Footer, even pages                                                                 | 10 pt; volume bold                                                                                                                                                                                                                                                               | "Maced. pharm. bull., **71** (2) 3 – 11 (2025)" **right-aligned (inner/spine side)**                                                                                                                                        |
| Footer, odd pages                                                                  | 10 pt; volume bold                                                                                                                                                                                                                                                               | "Макед. фарм. билт., **71** (2) 3 – 11 (2025)" **left-aligned (inner/spine side)**                                                                                                                                          |
| Page 1                                                                             | no running head, no footer citation line                                                                                                                                                                                                                                         |                                                                                                                                                                                                                             |
| "References"                                                                       | 11 pt bold                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                             |
| Reference entries                                                                  | **9 pt**, leading about 10.7 pt                                                                                                                                                                                                                                                  | justified, **hanging indent about 15 pt (5.2 mm)**, no space between entries                                                                                                                                                |
| Summary block                                                                      | 0.5 pt rule full width, then "**Резиме**" 11 pt bold centered, then title 18 pt bold centered, authors 14 pt, affiliations 10 pt italic, "**Клучни зборови:** …" 10 pt (keywords **before** the abstract), abstract 10 pt justified with indent, single column, ends with a rule | 71_2_001 p.11 (new page); 73_1_001 p.9 (same page, directly after References)                                                                                                                                               |

### H2. Specification for the new one-column PDF

**Engine:** any engine that supports CSS Paged Media or equivalent: `@page :left/:right` margins, running heads from strings, page-bottom footnotes, floats, and repeated table headers. Options include WeasyPrint, Paged.js with headless Chrome, Typst or LaTeX. The spec below is engine-neutral.

1. **Page size.** Keep the journal trim, **581.52 × 813.96 pt (205.2 × 287.2 mm)**, so new articles match the printed issues and the archive. Put it in config (`journal.pdf.page_size`) with A4 as the alternative [CONFIRM].
2. **Two-sided layout.**
    - First page = the article's `first_page` number (odd in all samples).
    - Mirrored margins: inner 24 mm, outer 21 mm, top 21.7 mm to the body, bottom 23 mm.
    - Text block **160 mm (453.5 pt)**.
    - Reasoning: keeping the original 176 mm with one column would give about 105 characters per line at 10 pt. 160 mm with 10.5/14.5 pt gives about 95 characters with generous leading, close to the IFA's own manuscript format: "single-column format… size 11… 1 ½ spaced… margins of 3.0 cm". This is a **design decision for the owner** [CONFIRM].
    - Alternative: keep 176 mm and use body 11/16 pt.
3. **Fonts.**
    - Use free Times-like faces that **cover Cyrillic** (the Резиме and Macedonian papers need it).
    - Primary: **Liberation Serif** (SIL OFL 1.1, metric-compatible with Times New Roman; Latin, Greek and Cyrillic, including Ѓ Ќ Ѕ Џ Љ Њ).
    - Math and symbol fallback: **STIX Two Text / STIX Two Math** (OFL; Times-like; strong coverage of math, arrows and Greek).
    - **TeX Gyre Termes is not suitable on its own**, because it has no Cyrillic. Use it only with a Cyrillic fallback.
    - Uncertain: whether Liberation Serif has Macedonian-specific italic glyph forms (б г д п т via OpenType `locl` MKD). The original TNR PDF uses the Russian forms too, so this keeps parity.
    - Embed every font as a subset. Enable hyphenation with en-GB/en-US or mk patterns according to the language.
4. **Sizes.** Keep every size in the H1 table, except the body text, which becomes **10.5 pt with 14.5 pt leading** (one column needs more leading). The abstract stays 9 pt/11 pt; references 9 pt/11 pt; tables 10 pt (9 pt allowed); captions 10 pt; L1 headings 11 pt bold; L2 10.5 pt italic. Indent 6 mm, justified.
5. **First page, top to bottom, all full width:** journal block (right-aligned, 4 lines) → about 80 pt gap → title → authors → affiliations → Received/Accepted → 0.75 pt rule → Abstract → Key words → 0.75 pt rule → `Introduction` begins (one column).
    - Corresponding-author footnote at the page bottom: short rule, then "*email: …". Add "Tel.: …" if the editors want the phone printed [CONFIRM: the IFA requires phone and fax to be provided, but the PDFs print only the e-mail].
    - Abbreviations footnote, if any, also goes here (IFA).
6. **Running heads (pages 2+).**
    - Even pages: italic page number at the outer left; centered author string "R. Ali, O. Majstorov, …", built as initials with full stops + family name, all authors, up to 2 lines.
    - Odd pages: centered `running_title` or the auto-truncated title with "…"; italic page number at the outer right.
    - 0.25 pt rule under the head across the text width.
7. **Footer (pages 2+).**
    - Even pages: "Maced. pharm. bull., **{vol}** ({issue}) {first} – {last} ({year})" aligned right (inner side).
    - Odd pages: "Макед. фарм. билт., **{vol}** ({issue}) {first} – {last} ({year})" aligned left (inner side).
    - Spaced en dash in the page range. Take the strings from config, not hard-coded.
8. **Floats.** Tables and figures are always full text width (no column floats any more). Place them at the top or bottom of the page or in place after the citing paragraph; never leave a caption separated from its object.
9. **End matter order:** Acknowledgement(s) → [Conflict of interest / Funding] → References → Appendices [CONFIRM order] → Summary.
    - The summary starts with a 0.5 pt rule and the centered "Резиме" label.
    - It may follow on the same page when at least about 40 % of the page is free, otherwise it starts a new page. Both behaviours are seen in the PDFs.
    - It is printed one-column in the original too, so no change is needed.
10. **PDF metadata.** Set Title, Author(s), Subject (journal, volume, issue, DOI), Keywords and language (`en` / `mk`). Tagged PDF (the originals are tagged). Credit stays on the website ("Nexsol Labs"), not inside the article PDF [CONFIRM].
11. **Variant PDFs from the same source:**
    - **Review copy.** Same layout plus a "Manuscript ID" header, line numbers, no DOI, volume or page numbers, and a footer "Under review".
        - If the review model is double-blind, also remove authors, affiliations, acknowledgements, the corresponding footnote and the summary author block.
        - The policy is unresolved: the review-policies page says "The Macedonian Pharmaceutical Bulletin employ blind peer review", while the editorial policies say "All manuscripts… go under double-blind reviews". Config key `review_model` [CONFIRM].
    - **Accepted-manuscript (early version) PDF.** The archive already contains these (72_1_006, 72_1_007, 72_2_006, 73_1_003), each with this verbatim cover text: "This is a PDF file of an unedited manuscript that has been accepted for publication. As a service to our customers we are providing this early version of the manuscript. The manuscript will undergo, copyediting, typesetting, and review of the resulting proof before it is published in its final form. Please note that during the production process errors may be discovered which could affect the content, and all legal disclaimers that apply to the journal pertain."
    - **Final / proof PDF.** Full journal block with DOI and page range. IFA: "One set of page proofs (as PDF files) will be sent by e-mail to the corresponding author."

---

## (i) Conflicts between the IFA, the policy pages and the PDFs (and other uncertainties)

1. **Columns.** The IFA manuscript format is "single-column format" on A4 with 3.0 cm margins, Times New Roman 11 pt, 1½ spacing. The published PDF is two-column on a 205.2 × 287.2 mm page. The owner wants one column, which is consistent with the IFA.
2. **Justification.** IFA: "do not use the wordprocessor's options to justify text or to hyphenate words". This applies to author files; the published PDF is justified. Justified + hyphenated output is fine because the system typesets it.
3. **Table footnote markers.** IFA: "superscript lowercase letter". PDF 71_2_001 Table 1 uses "*". Default to letters.
4. **Table header weight.** Bold in 71_2_001 T1, regular in all others. [CONFIRM]
5. **Figures and tables "each on a separate sheet".** IFA: "each should be given on a separate sheet (the place to which they belong in the text should be indicated)". This is obsolete with an in-app editor, which places them inline.
6. **Figure colour.** IFA: "Please submit the pictures in a black and white version". Modern PDFs contain colour-capable images. [CONFIRM]
7. **Corresponding author contact.** The IFA requires e-mail, phone, fax and postal address. The PDFs print only "*email: …". 71_2_008 has **two** corresponding authors, while the IFA implies one ("One Author designated as corresponding Author").
8. **Abbreviations footnote** on page 1 is required by the IFA, but no sampled PDF has one; abbreviations are defined in the text, e.g. "Cannabidiol (CBD)".
9. **Heading names.**
    - IFA "Material and methods" vs PDFs "Materials and methods" (72_1, 72_2, 73_1_003/004).
    - IFA "Conclusions" vs PDFs always "Conclusion".
    - IFA "Acknowledgements" vs PDFs "Acknowledgement" (73_1_001/002/003, 72_2_004).
    - "Results and discussion" vs "Results and Discussion".
10. **Abstract limits.** Reviews have no limit in the IFA. 73_1_001's abstract has 313 words (limit 250). Only a few are over; most are 119–249.
11. **Order of grouped citations.** The IFA says alphabetical then chronological. The PDF has "(Tyagi et al., 2014; Rajauria and Tiwari, 2018)", which is not alphabetical. Have the generator sort the group automatically.
12. **Reference details.** The IFA examples use "in:" lowercase and no DOI; the PDFs use "In:" and full DOI URLs. Page ranges mix "-" and "–". The IFA examples have no issue number; the PDFs add "21(1)".
13. **Page-range dash.** The page-1 journal line uses a hyphen "3 - 11", the footers an en dash "3 – 11". Use the en dash everywhere [CONFIRM].
14. **Errors in the template PDF** (do not copy): the last-page footer reads "Макед. фарм. билт., 71 (1) 3 – 11 (2025)" instead of 71 (2); the Резиме author line omits the first four authors (Ali, Majstorov, Petreska Ivanovska, Zhivikj); "Luft-Shorl" and "Feling" are spelling inconsistencies. The generator must build the summary author list from the same author records.
15. **Article types.** "Case study" and "Case report" are published but not defined in the IFA. "Mini-review" is in the IFA but not seen as a label. "Other contributions (recommendations and announcements, reports of meetings… book reviews…)" (Aims and scope) have no template. [CONFIRM which the app offers]
16. **Review model.** "blind peer review" (review-policies page) vs "double-blind reviews" (editorial policies) vs DOAJ single anonymous (per `config/journal.php`). This decides whether the review PDF is anonymised. [CONFIRM]
17. **Licence.** The IFA links "Creative Commons Attribution License" (CC BY 3.0 per config; DOAJ says 4.0), and no licence line is printed in the PDFs. The PDF should print one if the editors want it [CONFIRM] (config `licence`).
18. **APC.** 50 EUR "Upon acceptance" (DB page 3) vs no APC per DOAJ. [CONFIRM] This drives the paid/unpaid flag.
19. **Submission channel and deadlines.** IFA: "submit the manuscript electronically (e-mail address: magl@ff.ukim.edu.mk) as a single PDF file" is replaced by the app, and the IFA page text must be updated once the app goes live. The IFA revision deadline is "not more than 30 days"; make it configurable (`journal.revision_days = 30`).
20. **Ethics directive.** "EC Directive 86/609/EEC" was replaced by Directive 2010/63/EU. Keep the IFA wording until the editors update it [CONFIRM].
21. **Decimal separator.** Comma in the Macedonian summary, point in English, but 71_1_007 (English) uses commas. Not covered by the IFA. [CONFIRM]
22. **Received/Accepted precision.** Printed as month and year only. Store full dates and print month and year.
23. **Unconfirmed Macedonian labels:** type names other than "Стручен труд", and the Macedonian section labels other than Апстракт, Клучни зборови, Вовед, Заклучок, Литература, Табела, Слика, Summary.
24. **Uncertain measurements:** the margins (left 48.1 / right 34.3 pt on odd pages, left 36.8 / right 44.7 pt on even pages) are not exactly mirrored. This is an artefact of Word's gutter setting; the H2 values are a clean recommendation, not a copy.
