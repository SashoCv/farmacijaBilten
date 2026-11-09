import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { CopyIcon } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';
import { home } from '@/routes';

type Entry = {
    title: string;
    link: string;
    authors: string[];
    type: string | null;
    published: string | null;
    lang: string | null;
};

type Props = {
    feed: {
        kind: 'latest' | 'early-online';
        /** The Atom address readers subscribe to. */
        url: string;
        /** The website page the feed mirrors. */
        alternate: string;
        updated: string;
        entries: Entry[];
    };
};

const READERS = ['Feedly', 'Inoreader', 'Thunderbird', 'Zotero'];

/**
 * What a person sees on opening a feed address in the browser: what the feed
 * is, the address to copy into a feed reader, and the newest articles. Feed
 * readers get the Atom XML from the same address (FeedController).
 */
export default function FeedPage({ feed }: Props) {
    const { t, locale } = useT();
    const [copied, setCopied] = useState(false);

    const title =
        feed.kind === 'early-online'
            ? t('Early online feed')
            : t('Latest articles feed');

    const date = new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Skopje',
    });

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(feed.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <>
            <Head title={title} />

            <CmsPageHeader
                crumbs={[
                    { label: t('Home'), href: home.url() },
                    { label: title },
                ]}
                eyebrow={t('Follow new articles')}
                title={title}
                lead={t(
                    'This address is a feed: a feed reader checks it for you and shows each new article as soon as it is published.',
                )}
            />

            <div className="page-wrap section-y">
                <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-12">
                    <section
                        aria-labelledby="subscribe"
                        className="lg:col-span-5"
                    >
                        <div className="rounded-lg border border-line-card bg-white p-6">
                            <h2
                                id="subscribe"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('How to subscribe')}
                            </h2>
                            <ol className="mt-4 mb-0 flex flex-col gap-2 pl-5 text-ui text-ink-soft">
                                <li>{t('Copy the feed address below.')}</li>
                                <li>
                                    {t(
                                        'Paste it into your feed reader as a new subscription, for example {readers}.',
                                        { readers: READERS.join(', ') },
                                    )}
                                </li>
                            </ol>

                            <label
                                htmlFor="feed-url"
                                className="mt-5 block text-meta font-semibold text-ink"
                            >
                                {t('Feed address')}
                            </label>
                            <div className="mt-2 flex gap-2">
                                <input
                                    id="feed-url"
                                    readOnly
                                    value={feed.url}
                                    onFocus={(event) => event.target.select()}
                                    className="field h-11 min-w-0 flex-1 px-3 font-mono text-meta"
                                />
                                <button
                                    type="button"
                                    onClick={copy}
                                    className="btn-primary inline-flex shrink-0 items-center gap-2"
                                >
                                    <CopyIcon aria-hidden />
                                    {copied ? t('Copied') : t('Copy')}
                                </button>
                            </div>
                            <p
                                role="status"
                                aria-live="polite"
                                className="sr-only"
                            >
                                {copied ? t('Feed address copied.') : ''}
                            </p>

                            <p className="mt-5 mb-0 text-meta text-ink-muted">
                                {t('Prefer the website?')}{' '}
                                <a href={feed.alternate} className="link-u">
                                    {feed.kind === 'early-online'
                                        ? t('Early online articles')
                                        : t('Latest issue and articles')}
                                </a>
                            </p>
                        </div>
                    </section>

                    <section
                        aria-labelledby="in-feed"
                        className="min-w-0 lg:col-span-7"
                    >
                        <h2
                            id="in-feed"
                            className="m-0 border-b border-line-strong pb-3 font-serif text-h3 font-medium text-ink"
                        >
                            {t('Now in the feed')}
                        </h2>
                        {feed.entries.length === 0 ? (
                            <p className="mt-4 text-ui text-ink-muted">
                                {t('No articles at the moment.')}
                            </p>
                        ) : (
                            <ol className="m-0 list-none p-0">
                                {feed.entries.map((entry) => (
                                    <li
                                        key={entry.link}
                                        className="border-b border-line py-4"
                                    >
                                        <Link
                                            href={entry.link}
                                            lang={entry.lang ?? undefined}
                                            className="font-serif text-[18px] leading-snug font-medium text-ink no-underline hover:text-brand hover:underline"
                                        >
                                            {entry.title}
                                        </Link>
                                        {entry.authors.length > 0 && (
                                            <p className="mt-1 mb-0 text-ui text-ink-soft">
                                                {entry.authors.join(', ')}
                                            </p>
                                        )}
                                        <p className="mt-1 mb-0 text-meta text-ink-muted">
                                            {[
                                                entry.type
                                                    ? t(entry.type)
                                                    : null,
                                                entry.published
                                                    ? date.format(
                                                          new Date(
                                                              entry.published,
                                                          ),
                                                      )
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
