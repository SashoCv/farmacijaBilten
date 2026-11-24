/*
 * Peer review (docs/backoffice, release 2b): the contract between the
 * reviewer, admin and author pages and the server. Reviewers are always
 * "Reviewer 1, 2, …" to authors; names reach only the editorial office.
 */

export type AssignmentStatus =
    | 'invited'
    | 'accepted'
    | 'declined'
    | 'submitted'
    | 'cancelled'
    | 'expired';

/** The reviewer's advice. The editor decides. */
export type Recommendation =
    | 'accept'
    | 'minor_revision'
    | 'major_revision'
    | 'reject';

/** The editorial decision sent to the author. */
export type DecisionType =
    | 'accept'
    | 'minor_revision'
    | 'major_revision'
    | 'reject'
    /** Technical return before review (status submitted or resubmitted only). */
    | 'return';

/** Editorial notes on admin/manuscripts/show (prop `notes`): internal, or sent to the authors by choice; never shown to reviewers. */
export type AdminNotes = {
    items: {
        id: number;
        author: string | null;
        body: string;
        at: string;
        /** Sent to the authors (e-mailed, shown on their page) instead of internal. */
        visibleToAuthor: boolean;
    }[];
    /** POST (Inertia) { body, visible_to_author }. */
    url: string;
};

export type ReviewFile = {
    id: string;
    name: string;
    size: number;
    /** 'author': shared with the author with the decision; 'editor': editorial office only. */
    visibility: 'author' | 'editor';
    url: string;
    /** Present for the reviewer while the review is not yet submitted. */
    deleteUrl?: string | null;
};

export type SubmittedReview = {
    recommendation: Recommendation | null;
    commentsToAuthor: string;
    /** Confidential; never shown to the author. Absent in author views. */
    commentsToEditor?: string;
    files: ReviewFile[];
    submittedAt: string | null;
};

/* --- Admin: manuscript page (admin/manuscripts/show), prop `reviews` ---- */

export type AdminAssignment = {
    id: string;
    round: number;
    /** "Reviewer N" as the author will see it. */
    number: number;
    name: string;
    email: string;
    status: AssignmentStatus;
    invitedAt: string | null;
    respondedAt: string | null;
    responseDueAt: string | null;
    reviewDueAt: string | null;
    submittedAt: string | null;
    declineReason: string | null;
    /** Competing interests declared on accepting ("none" when declared none). */
    competingInterests: string | null;
    review: SubmittedReview | null;
    /** POST (Inertia) to withdraw the invitation; null when not possible. */
    cancelUrl: string | null;
    /** POST (Inertia) to e-mail a reminder now; null when not possible. */
    remindUrl: string | null;
};

export type Decision = {
    id: number;
    round: number;
    type: DecisionType;
    letter: string;
    decidedBy: string | null;
    at: string;
};

export type AdminReviews = {
    /** The review round in progress (1 for the first submission). */
    round: number;
    /** Reviewers can be invited now (submitted, under review or resubmitted). */
    canInvite: boolean;
    /**
     * POST (Inertia) with { email, name, response_days, review_days, message? }.
     * response_days default 7, review_days default 21 (from the server config).
     */
    inviteUrl: string;
    defaults: { responseDays: number; reviewDays: number };
    /** The author's suggestions (name, institution, e-mail). */
    suggested: { name: string; affiliation: string; email: string }[];
    /**
     * People with the reviewer role, for quick picking (authors of this paper
     * excluded), then people invited to the list who have no account yet
     * (`pending`, id null).
     */
    pool: {
        id: number | null;
        name: string;
        email: string;
        affiliation: string | null;
        expertise: string | null;
        pending: boolean;
    }[];
    /** Every invitation of every round, newest round first. */
    assignments: AdminAssignment[];
    decision: {
        /** A decision can be made now. */
        canDecide: boolean;
        /** POST (Inertia) with { type: DecisionType, letter: string }. */
        url: string;
        types: DecisionType[];
    };
    decisions: Decision[];
    /** Anonymity of the review ('double': reviewers do not see the authors). */
    anonymity: 'double' | 'single';
};

/* --- Reviewer pages ------------------------------------------------------ */

/** pages/reviewer/reviews/index.tsx */
export type ReviewerIndexProps = {
    assignments: {
        id: string;
        status: AssignmentStatus;
        round: number;
        reference: string | null;
        title: string;
        typeLabel: string;
        invitedAt: string | null;
        responseDueAt: string | null;
        reviewDueAt: string | null;
        submittedAt: string | null;
        url: string;
    }[];
};

/** pages/reviewer/reviews/show.tsx */
export type ReviewerShowProps = {
    assignment: {
        id: string;
        status: AssignmentStatus;
        round: number;
        number: number;
        invitedAt: string | null;
        responseDueAt: string | null;
        reviewDueAt: string | null;
        submittedAt: string | null;
        /** The editorial office's personal note in the invitation, if any. */
        message: string | null;
    };
    manuscript: {
        reference: string | null;
        title: string;
        typeLabel: string;
        /**
         * Before accepting: the title page and abstract only (no authors under
         * double-anonymous review). After accepting: the whole article. Trusted
         * server HTML, styled by manuscript.css + manuscript-article.css (.ms).
         */
        html: string;
        /** Word file of the same (anonymised) text; null before accepting. */
        docxUrl: string | null;
        /** Round 2+: the authors' response to the previous reviews. */
        responseToReviewers: string | null;
    };
    review: SubmittedReview & { commentsToEditor: string };
    recommendations: Recommendation[];
    urls: {
        /** POST (Inertia) { decision: 'accept'|'decline', competing_interests: 'none'|'declared', competing_interests_note?: string, decline_reason?: string } */
        respond: string;
        /** PUT JSON or Inertia { recommendation, comments_to_author, comments_to_editor } (save as draft). */
        save: string;
        /** POST (Inertia) same fields; submits the review (final). */
        submit: string;
        /** POST multipart { file, visibility: 'author'|'editor' } → JSON ReviewFile. */
        upload: string;
    };
    /** Upload limits. */
    files: { maxMb: number; extensions: string[] };
};

/* --- Invitation landing page (pages/auth/invitation.tsx, no sign-in) ----- */

export type InvitationProps = {
    /** The invited address. */
    email: string;
    name: string | null;
    manuscript: { title: string; typeLabel: string; abstractHtml: string };
    responseDueAt: string | null;
    reviewDueAt: string | null;
    message: string | null;
    /**
     * 'create': no account for this e-mail yet, show the short sign-up form
     *   (given_name, family_name, affiliation, country_code, password,
     *   password_confirmation, privacy) and POST it to urls.createAccount;
     * 'sign_in': an account exists: link to urls.signIn (returns here after);
     * 'wrong_account': signed in with another e-mail: offer to sign out (POST urls.signOut);
     * 'closed': the invitation was withdrawn, expired or already answered.
     */
    mode: 'create' | 'sign_in' | 'wrong_account' | 'closed';
    signedInAs: string | null;
    countries: string[];
    passwordRules: string;
    urls: { createAccount: string; signIn: string; signOut: string };
};

/** pages/auth/reviewer-signup.tsx: the link in the e-mail inviting someone to the list of reviewers. */
export type ReviewerSignupProps = {
    email: string;
    givenName: string | null;
    familyName: string | null;
    affiliation: string | null;
    message: string | null;
    /**
     * 'create': show the sign-up form, POST it to urls.createAccount;
     * 'sign_in': the account exists and is a reviewer: link to urls.signIn;
     * 'wrong_account': signed in with another e-mail: offer to sign out;
     * 'closed': the invitation was withdrawn, replaced by a newer e-mail or used.
     */
    mode: 'create' | 'sign_in' | 'wrong_account' | 'closed';
    signedInAs: string | null;
    countries: string[];
    passwordRules: string;
    urls: { createAccount: string; signIn: string; signOut: string };
};

/* --- Author: decisions on the manuscript page (author/manuscripts/show) --- */

export type AuthorDecision = {
    round: number;
    type: DecisionType;
    letter: string;
    at: string;
    /** Reviews of that round, anonymised; comments to the editor never included. */
    reviews: {
        number: number;
        commentsToAuthor: string;
        files: ReviewFile[];
    }[];
};

/* --- Admin dashboard (pages/dashboard.tsx prop `stats`, admins only) ---- */

export type AttentionKind =
    | 'review_overdue'
    | 'answer_overdue'
    | 'ready_for_decision'
    | 'revision_received'
    | 'new'
    | 'needs_reviewers';

export type AdminDashboardStats = {
    totals: {
        /** Manuscripts ever sent (drafts excluded). */
        received: number;
        thisYear: number;
        /** Submitted, under review, revision requested or resubmitted. */
        inProgress: number;
        accepted: number;
        rejected: number;
        /** Accepted / (accepted + rejected), %; null before any final decision. */
        acceptanceRate: number | null;
        /** Average days from receipt to the first decision. */
        daysToFirstDecision: number | null;
    };
    /** Count per status (no drafts). */
    byStatus: Record<string, number>;
    byType: { type: string; label: string; count: number }[];
    /** Last 12 months, oldest first: manuscripts received and decisions made. */
    months: { month: string; received: number; decided: number }[];
    reviews: {
        awaitingAnswer: number;
        inProgress: number;
        overdue: number;
        submitted: number;
        declined: number;
        /** Average days from accepting to submitting a review. */
        averageDays: number | null;
    };
    /** What needs the editorial office now, most urgent first (max 25). */
    attention: {
        kind: AttentionKind;
        reference: string | null;
        title: string;
        author: string | null;
        /** For manuscripts: since when (sent/updated). */
        since: string | null;
        url: string;
        /** For overdue reviews/answers: who and the due date. */
        reviewer: string | null;
        dueAt: string | null;
    }[];
};

/* --- Admin: reviewers page (pages/admin/reviewers/index.tsx) ------------- */

export type ReviewersIndexProps = {
    reviewers: {
        email: string;
        name: string;
        userId: number | null;
        affiliation: string | null;
        expertise: string | null;
        hasAccount: boolean;
        counts: {
            invited: number;
            accepted: number;
            declined: number;
            submitted: number;
            expired: number;
        };
        averageDays: number | null;
        lastActivity: string | null;
        /** Newest first. */
        assignments: {
            id: string;
            reference: string | null;
            title: string;
            round: number;
            status: AssignmentStatus;
            invitedAt: string | null;
            /** Answer due (invited) or review due (accepted). */
            dueAt: string | null;
            submittedAt: string | null;
            overdue: boolean;
            recommendation: Recommendation | null;
            url: string;
        }[];
    }[];
    /** Invited to the list of reviewers, no account yet. */
    invites: {
        id: number;
        email: string;
        name: string;
        affiliation: string | null;
        expertise: string | null;
        invitedAt: string;
        invitedBy: string | null;
        /** POST: the e-mail again with a new link. */
        resendUrl: string;
        /** DELETE: withdraw the invitation. */
        withdrawUrl: string;
    }[];
    /** POST { email, given_name, family_name, affiliation?, expertise?, message? }. */
    storeUrl: string;
};

/* --- Admin: e-mail templates (pages/admin/mail-templates/*) -------------- */

export type MailTemplateAudience = 'author' | 'reviewer' | 'editors';

/** pages/admin/mail-templates/index.tsx */
export type MailTemplatesIndexProps = {
    templates: {
        key: string;
        audience: MailTemplateAudience;
        /** English sentence (translate with t()). */
        description: string;
        /** Current subject in the UI language. */
        subject: string;
        /** The editorial office changed it (in either language). */
        customised: boolean;
        updatedAt: string | null;
        url: string;
    }[];
};

/** pages/admin/mail-templates/edit.tsx */
export type MailTemplateEditProps = {
    template: {
        key: string;
        audience: MailTemplateAudience;
        description: string;
        /** {placeholder} → English description (translate with t()). */
        placeholders: Record<string, string>;
        /** The e-mail has a button (placed where {button} stands, or at the end). */
        hasButton: boolean;
        languages: Record<
            'en' | 'mk',
            {
                subject: string;
                body: string;
                defaultSubject: string;
                defaultBody: string;
                customised: boolean;
            }
        >;
    };
    urls: {
        /** PUT (Inertia) { en: {subject, body}, mk: {subject, body} } */
        update: string;
        /** POST (Inertia): back to the original wording (both languages). */
        reset: string;
        /** POST JSON { locale, subject, body } → { subject, html } (full e-mail HTML, show in a sandboxed iframe srcdoc). */
        preview: string;
        index: string;
    };
};
