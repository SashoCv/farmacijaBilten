<?php

namespace App\Enums;

/** Where a manuscript is in the editorial process (docs/backoffice/plan.md §4). */
enum ManuscriptStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case RevisionRequested = 'revision_requested';
    case Resubmitted = 'resubmitted';
    case Accepted = 'accepted';
    case InProduction = 'in_production';
    case Published = 'published';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    /** English label; translated with __() / t(). */
    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Submitted',
            self::UnderReview => 'Under review',
            self::RevisionRequested => 'Revision requested',
            self::Resubmitted => 'Resubmitted',
            self::Accepted => 'Accepted for publication',
            self::InProduction => 'In production',
            self::Published => 'Published in the journal',
            self::Rejected => 'Rejected',
            self::Withdrawn => 'Withdrawn',
        };
    }

    /** The author may change the text (a draft, or a revision they were asked for). */
    public function isEditableByAuthor(): bool
    {
        return $this === self::Draft || $this === self::RevisionRequested;
    }
}
