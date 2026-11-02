import { Head } from '@inertiajs/react';
import { AimsScope } from '@/components/journal/home/aims-scope';
import { ArchiveStrip } from '@/components/journal/home/archive-strip';
import { CurrentIssueCard } from '@/components/journal/home/current-issue-card';
import { EditorMessage } from '@/components/journal/home/editor-message';
import { HomeHero } from '@/components/journal/home/home-hero';
import { JournalRail } from '@/components/journal/home/journal-rail';
import { LatestArticles } from '@/components/journal/home/latest-articles';
import { SupplementBanner } from '@/components/journal/home/supplement-banner';
import { useT } from '@/lib/i18n';
import type {
    ArticleSummary,
    IssueDetail,
    IssueSummary,
    VolumeSummary,
} from '@/types/journal';

type Props = {
    currentIssue: IssueDetail;
    /** Every article of the current issue, in table-of-contents order. */
    currentArticles: ArticleSummary[];
    supplement: IssueDetail | null;
    /** The supplement's first contributions (10). */
    supplementArticles: ArticleSummary[];
    earlyOnlineCount: number;
    /** Newest early online articles (10). */
    earlyOnlineArticles: ArticleSummary[];
    /** The six newest published issues after the current one. */
    recentIssues: IssueSummary[];
    /** Oldest volume online, for "Online archive from Volume 47 (2001)". */
    archiveStart: { volume: number; year: number | null } | null;
    volumes: VolumeSummary[];
    /** The mission sentence from the Editor's words, verbatim; null if the page is missing. */
    editorQuote: string | null;
};

export default function Home({
    currentIssue,
    currentArticles,
    supplement,
    supplementArticles,
    earlyOnlineCount,
    earlyOnlineArticles,
    recentIssues,
    archiveStart,
    volumes,
    editorQuote,
}: Props) {
    const { t } = useT();

    return (
        <>
            <Head
                title={t(
                    'Macedonian Pharmaceutical Bulletin — Open-access peer-reviewed journal',
                )}
            >
                <meta
                    name="description"
                    content={t(
                        'Macedonian Pharmaceutical Bulletin: an open-access, peer-reviewed international journal of the Macedonian Pharmaceutical Association and the Faculty of Pharmacy in Skopje.',
                    )}
                />
            </Head>

            {/* Masthead + current issue: the right column lines up with the rail below. */}
            <div className="border-b border-line bg-mist">
                <div className="page-wrap grid gap-x-6 gap-y-6 py-7 md:py-9 lg:grid-cols-12 lg:items-center lg:gap-x-12">
                    <HomeHero className="lg:col-span-8" />
                    <CurrentIssueCard
                        issue={currentIssue}
                        className="lg:col-span-4 lg:col-start-9"
                    />
                </div>
            </div>

            <div className="page-wrap grid gap-x-6 gap-y-12 pt-7 pb-10 md:pt-9 md:pb-12 lg:grid-cols-12 lg:gap-x-12">
                <LatestArticles
                    currentIssue={currentIssue}
                    currentArticles={currentArticles}
                    earlyOnlineCount={earlyOnlineCount}
                    earlyOnlineArticles={earlyOnlineArticles}
                    supplement={supplement}
                    supplementArticles={supplementArticles}
                    className="lg:col-span-8"
                />
                <div className="lg:col-span-4 lg:col-start-9">
                    <JournalRail>
                        {supplement && supplementArticles.length > 0 && (
                            <SupplementBanner
                                supplement={supplement}
                                articles={supplementArticles}
                            />
                        )}
                    </JournalRail>
                </div>
            </div>

            {editorQuote && <EditorMessage quote={editorQuote} />}

            <AimsScope />

            <ArchiveStrip
                issues={recentIssues}
                volumes={volumes}
                start={archiveStart}
            />
        </>
    );
}
