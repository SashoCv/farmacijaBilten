import type { ManuscriptStatus } from '@/types/manuscript';
import type {
    AssignmentStatus,
    DecisionType,
    Recommendation,
} from '@/types/review';

/*
 * Manuscript statuses as the interface names them. The labels are English
 * keys: translate them with t() where they are shown (resources/js/lang/mk.ts
 * has the Macedonian names).
 */

const LABELS: Record<ManuscriptStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    revision_requested: 'Revision requested',
    resubmitted: 'Resubmitted',
    accepted: 'Accepted for publication',
    in_production: 'In production',
    published: 'Published in the journal',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
};

/** The English label of a status (a t() key). Unknown values come back as they are. */
export function statusLabel(status: string): string {
    return LABELS[status as ManuscriptStatus] ?? status;
}

const NEXT: Record<ManuscriptStatus, string> = {
    draft: 'Finish the manuscript and send it to the journal.',
    submitted: 'The editorial office is checking the manuscript before review.',
    under_review:
        'The manuscript is with the reviewers; the editorial office will write to you with the decision.',
    revision_requested: 'Revise the manuscript and submit it again.',
    resubmitted: 'The editorial office is checking your revision.',
    accepted: 'Accepted: the manuscript is being prepared for publication.',
    in_production: 'The manuscript is being prepared for publication.',
    published:
        'Published online: you can see the article on the journal website.',
    rejected: 'The manuscript was not accepted for publication.',
    withdrawn: 'The manuscript was withdrawn.',
};

/** One English sentence (t() key) for the author: what happens next in this status. */
export function statusNext(status: string): string {
    return NEXT[status as ManuscriptStatus] ?? '';
}

/** Every status, in workflow order. */
export const MANUSCRIPT_STATUSES = Object.keys(LABELS) as ManuscriptStatus[];

/** Statuses in which the author may still change the manuscript. */
export function isEditableByAuthor(status: ManuscriptStatus): boolean {
    return status === 'draft' || status === 'revision_requested';
}

/** English label (translated with t()) of a history event that is not a status change. */
export function eventLabel(type: string): string {
    const labels: Record<string, string> = {
        submitted: 'Sent to the journal',
        publication_details_updated: 'Publication details updated',
        under_review: 'Sent to reviewers',
        reviewer_invited: 'Reviewer invited',
        invitation_accepted: 'Reviewer accepted',
        invitation_declined: 'Reviewer declined',
        review_submitted: 'Review received',
        invitation_cancelled: 'Invitation withdrawn',
        decision: 'Decision',
        resubmitted: 'Revision received',
        note_to_author: 'Message from the editorial office',
        assigned_to_issue: 'Placed in an issue',
        removed_from_issue: 'Removed from the issue',
        published: 'Published online',
    };

    return labels[type] ?? type;
}

const RECOMMENDATIONS: Record<Recommendation, string> = {
    accept: 'Accept as it is',
    minor_revision: 'Minor revision',
    major_revision: 'Major revision',
    reject: 'Reject',
};

/** English label (t() key) of a reviewer's recommendation. */
export function recommendationLabel(recommendation: string): string {
    return RECOMMENDATIONS[recommendation as Recommendation] ?? recommendation;
}

const DECISIONS: Record<DecisionType, string> = {
    accept: 'Accepted for publication',
    minor_revision: 'Minor revision requested',
    major_revision: 'Major revision requested',
    reject: 'Rejected',
    return: 'Returned for corrections',
};

/** English label (t() key) of an editorial decision, as the authors read it. */
export function decisionLabel(type: string): string {
    return DECISIONS[type as DecisionType] ?? type;
}

const DECISION_ACTIONS: Record<DecisionType, string> = {
    accept: 'Accept for publication',
    minor_revision: 'Request a minor revision',
    major_revision: 'Request a major revision',
    reject: 'Reject',
    return: 'Return to the authors for corrections',
};

/** English label (t() key) of a decision as the editor chooses it. */
export function decisionActionLabel(type: string): string {
    return DECISION_ACTIONS[type as DecisionType] ?? type;
}

const ASSIGNMENT_STATUSES: Record<AssignmentStatus, string> = {
    invited: 'Invited',
    accepted: 'Reviewing',
    declined: 'Declined',
    submitted: 'Review received',
    cancelled: 'Withdrawn',
    expired: 'No answer (expired)',
};

/** English label (t() key) of a reviewer assignment's status. */
export function assignmentStatusLabel(status: string): string {
    return ASSIGNMENT_STATUSES[status as AssignmentStatus] ?? status;
}
