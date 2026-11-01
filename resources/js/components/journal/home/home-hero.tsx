import { usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { HeroSearch } from '@/components/journal/home/hero-search';
import { useT } from '@/lib/i18n';

/**
 * Masthead: what the journal is, who publishes it, and search. The reader's
 * language leads; the other name follows, smaller.
 */
export function HomeHero({ className }: { className?: string }) {
    const { t, locale } = useT();
    const { journal } = usePage().props;
    const mk = locale === 'mk';

    const primary = mk
        ? { name: journal.nameMk, lang: 'mk' }
        : { name: journal.nameEn, lang: 'en' };
    const secondary = mk
        ? { name: journal.nameEn, lang: 'en' }
        : { name: journal.nameMk, lang: 'mk' };

    return (
        <div className={cn('flex min-w-0 flex-col', className)}>
            <p className="eyebrow">
                {journal.foundedYear
                    ? t('Open-access, peer-reviewed journal · since {year}', {
                          year: journal.foundedYear,
                      })
                    : t('Open-access, peer-reviewed journal')}
            </p>
            <h1
                id="hero-title"
                lang={primary.lang}
                className="m-0 mt-2.5 font-serif text-[34px] leading-[1.1] font-medium tracking-[-0.015em] text-balance text-ink sm:text-display"
            >
                {primary.name}
            </h1>
            <p
                lang={secondary.lang}
                className="m-0 mt-1.5 font-serif text-[18px] leading-[1.3] text-ink-soft md:text-[20px]"
            >
                {secondary.name}
            </p>
            <p className="m-0 mt-3 max-w-[70ch] text-body text-ink-soft">
                {t(
                    'Published by the {publisher} in cooperation with the {faculty}.',
                    {
                        publisher: mk
                            ? journal.publisher.nameMk
                            : journal.publisher.nameEn,
                        faculty: mk
                            ? journal.coPublisher.nameMk
                            : journal.coPublisher.nameEn,
                    },
                )}
            </p>
            <HeroSearch className="mt-5 max-w-[600px]" />
        </div>
    );
}
