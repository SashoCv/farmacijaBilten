#!/usr/bin/env bash
# SPIKE S2: build the sample PDF with WeasyPrint and render page PNGs.
# Usage: docs/backoffice/spikes/pdf/build.sh
# Needs: weasyprint >= 69 (macOS: brew install weasyprint; Ubuntu: pipx install weasyprint)
#        and poppler-utils (pdftoppm, pdfinfo, pdffonts) for the PNG/inspection step.
set -euo pipefail
cd "$(dirname "$0")"

WEASYPRINT="$(command -v weasyprint)"
# The Python that runs WeasyPrint (from the CLI script's shebang), used for render.py.
PY="${WEASY_PYTHON:-$(head -1 "$(readlink -f "$WEASYPRINT")" | sed 's/^#!//')}"
OUT=sample-weasyprint.pdf

"$WEASYPRINT" --version
start=$(python3 -c 'import time; print(time.time())')
# render.py = WeasyPrint + a Macedonian hyphenation mapping (see the file);
# pdf/ua-1 gives a tagged PDF; base URL "." keeps fonts and CSS local (no HTTP).
"$PY" render.py template.html "$OUT"
end=$(python3 -c 'import time; print(time.time())')
python3 -c "print('render time (wall, incl. Python start-up): %.2f s' % ($end - $start))"

rm -f png/sample-*.png
mkdir -p png
pdftoppm -r 70 -png "$OUT" png/sample
pdfinfo "$OUT" | grep -E 'Title|Author|Keywords|Pages|Page size|Tagged|Producer'
pdffonts "$OUT"
