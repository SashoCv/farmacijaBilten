"""Render a manuscript HTML file to PDF with WeasyPrint.

Usage (with the Python that has WeasyPrint installed):
    python render.py in.html out.pdf

Prints "pages=N" when done.

Called by App\\Manuscripts\\Rendering\\PdfRenderer. Why a wrapper instead of the
`weasyprint` command: Pyphen (WeasyPrint's hyphenation library) has no
Macedonian dictionary, so text in lang="mk" would not be hyphenated. Serbian
Cyrillic patterns hyphenate Macedonian correctly (same syllable rules), so
"mk" is mapped to them; the document keeps lang="mk".
"""
import os
import sys

import pyphen

if "mk" not in pyphen.LANGUAGES:
    pyphen.LANGUAGES["mk"] = pyphen.LANGUAGES["sr"]
    getattr(pyphen, "LANGUAGES_LOWERCASE", {})["mk"] = "mk"

from weasyprint import HTML  # noqa: E402  (after the Pyphen patch)

src, out = sys.argv[1], sys.argv[2]
document = HTML(filename=src, base_url=os.path.dirname(os.path.abspath(src))).render()
document.write_pdf(out, pdf_variant="pdf/ua-1")

# The number of pages, read by PdfRenderer (the article's last page).
print(f"pages={len(document.pages)}")
