/*
 * Preparing issues and publishing (App\Http\Controllers\Admin\IssueAdminController,
 * App\Manuscripts\Publishing). An open issue is "in preparation": on the public
 * site its articles appear under Early online. Closing it publishes it.
 */

/** pages/admin/issues/show.tsx */
export type IssueShowProps = {
    issue: {
        slug: string;
        label: string;
        year: number | null;
        /** Closed = published (the current issue on the site). */
        closed: boolean;
        publicUrl: string;
        /** Read-only archive view of the same issue. */
        archiveUrl: string;
        /** POST (Inertia): close the issue. Errors in `errors.issue`. */
        closeUrl: string;
        /** POST (Inertia) { order: string[] } — manuscript ids in the new order. */
        reorderUrl: string;
        crossref: {
            /** Published DOIs not registered at Crossref yet. */
            pending: number;
            /** GET: the deposit file. */
            xmlUrl: string;
            /** POST (Inertia): send to Crossref; null when the account is not set. */
            depositUrl: string | null;
            /** The DOI check page (settings, deposits). */
            checkUrl: string;
        };
    };
    /** Manuscripts placed in this issue, in order. */
    manuscripts: {
        id: string;
        reference: string | null;
        title: string;
        authorsLine: string;
        status: string;
        position: number | null;
        doi: string | null;
        pages: string | null;
        /** admin manuscript page */
        url: string;
        /** POST (Inertia, forceFormData) { pdf?: File }: publish online; without a file the PDF is made from the manuscript. Null when not possible. */
        publishUrl: string | null;
        /** GET: the manuscript as a PDF in the journal layout (preview). */
        pdfUrl: string;
        /** Public article page once published. */
        articleUrl: string | null;
    }[];
    /** Articles already in the issue (from the old site or published from the system). */
    articles: {
        number: string;
        title: string;
        authors: string[];
        doi: string | null;
        pages: string | null;
        pdfUrl: string | null;
        publicUrl: string;
        fromSystem: boolean;
    }[];
    /** Accepted manuscripts not yet in any issue (quick add: POST assignUrl { issue: slug }). */
    waiting: {
        id: string;
        reference: string | null;
        title: string;
        url: string;
        assignUrl: string;
    }[];
};

/** admin/manuscripts/show prop `publishing` */
export type ManuscriptPublishing = {
    /** Accepted (or in production): can be placed in an issue. */
    canAssign: boolean;
    issue: { slug: string; label: string; url: string } | null;
    openIssues: { slug: string; label: string }[];
    /** POST (Inertia) { issue: slug | null } */
    assignUrl: string;
    /** POST { pdf?: File } when accepted and placed in an issue; without a file the PDF is made from the manuscript. */
    publishUrl: string | null;
    /** GET: the manuscript as a PDF in the journal layout (preview). */
    pdfUrl: string;
    /** The public article once published. */
    articleUrl: string | null;
};

/** author/manuscripts/show prop `publication`: where the author's paper is (or will be) published. */
export type AuthorPublication = {
    /** "Volume 73, Issue 1" once placed in an issue. */
    issue: string | null;
    year: number | null;
    /** "3–11" */
    pages: string | null;
    doi: string | null;
    publishedAt: string | null;
    /** The article on the journal website once published. */
    articleUrl: string | null;
};
