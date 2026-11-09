# Crossref deposit schema 5.3.1

The official Crossref metadata deposit schema (https://gitlab.com/crossref/schema,
`schemas/`), the files `crossref5.3.1.xsd` needs. `App\Crossref\Crossref::validate()`
checks every deposit against it before it is downloaded or sent.

Changed: the MathML import in `crossref5.3.1.xsd` and `common5.3.1.xsd` points to
the local copy in `standard-modules/mathml3/` instead of w3.org, so validation
works without network access.
