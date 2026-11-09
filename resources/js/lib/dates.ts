import { useState } from 'react';
import { useT } from '@/lib/i18n';

const DAY = 86_400_000;

export type Due = {
    /** Translated: "Due in 5 days", "Due today", "Overdue by 2 days". */
    text: string;
    overdue: boolean;
    /** Due within three days. */
    soon: boolean;
};

/**
 * Dates as the back office shows them (Europe/Skopje, the reader's
 * language) and countdowns to due dates in words, so an overdue date is
 * never marked by colour alone.
 */
export function useDates() {
    const { locale, t } = useT();
    const [now] = useState(() => Date.now());
    const tag = locale === 'mk' ? 'mk-MK' : 'en-GB';
    const dateFormat = new Intl.DateTimeFormat(tag, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Skopje',
    });
    const dateTimeFormat = new Intl.DateTimeFormat(tag, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Europe/Skopje',
    });

    const valid = (iso: string | null | undefined): iso is string =>
        Boolean(iso) && !Number.isNaN(Date.parse(iso as string));

    return {
        date: (iso: string | null | undefined) =>
            valid(iso) ? dateFormat.format(new Date(iso)) : '—',
        dateTime: (iso: string | null | undefined) =>
            valid(iso) ? dateTimeFormat.format(new Date(iso)) : '—',
        due: (iso: string | null | undefined): Due | null => {
            if (!valid(iso)) {
                return null;
            }

            const days = Math.ceil((Date.parse(iso) - now) / DAY);

            if (days < 0) {
                return {
                    text:
                        days === -1
                            ? t('Overdue by 1 day')
                            : t('Overdue by {count} days', { count: -days }),
                    overdue: true,
                    soon: false,
                };
            }

            return {
                text:
                    days === 0
                        ? t('Due today')
                        : days === 1
                          ? t('Due tomorrow')
                          : t('Due in {count} days', { count: days }),
                overdue: false,
                soon: days <= 3,
            };
        },
    };
}

/** "12.4 MB", "830 KB". */
export function fileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
