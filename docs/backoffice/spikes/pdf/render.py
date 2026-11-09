"""SPIKE S2: render an HTML manuscript to PDF with WeasyPrint.

Run with the Python interpreter that has WeasyPrint installed (the one in the
`weasyprint` script's shebang): python render.py in.html out.pdf

Why a wrapper instead of the `weasyprint` CLI: Pyphen (WeasyPrint's hyphenation
library) ships no Macedonian dictionary, so text in lang="mk" is not hyphenated at all.
Serbian Cyrillic patterns (hyph_sr.dic) hyphenate Macedonian words correctly (same
syllable rules, same alphabet apart from Ѓ Ќ Ѕ, which the patterns treat as ordinary
letters), so "mk" is mapped to them here. The document keeps lang="mk", so the PDF
language tag, screen readers and font shaping stay Macedonian.
"""
import sys
import time

import pyphen

if "mk" not in pyphen.LANGUAGES:
    # Pyphen 0.17+: language_fallback() looks names up in LANGUAGES_LOWERCASE.
    pyphen.LANGUAGES["mk"] = pyphen.LANGUAGES["sr"]
    getattr(pyphen, "LANGUAGES_LOWERCASE", {})["mk"] = "mk"

from weasyprint import HTML  # noqa: E402  (after the Pyphen patch)

src, out = sys.argv[1], sys.argv[2]
start = time.perf_counter()
HTML(filename=src, base_url=".").write_pdf(out, pdf_variant="pdf/ua-1")
print(f"render time (in-process, excl. interpreter start): {time.perf_counter() - start:.2f} s")
