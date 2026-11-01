import { usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useT } from '@/lib/i18n';
import type { IndexingService } from '@/types/journal';

type Props = {
    /** `light` on white or mist (greyscale, colour on hover); `dark` on navy (mono white). */
    variant?: 'light' | 'dark';
    /** Show the original EBSCO licensing sentence under the logos. */
    showEbscoStatement?: boolean;
    className?: string;
};

/**
 * Logos of the services that index the journal (from config `journal.indexing`),
 * each linked to the journal's own record there.
 */
export function IndexingLogos({
    variant = 'light',
    showEbscoStatement = false,
    className,
}: Props) {
    const { t } = useT();
    const { indexing, ebscoStatement } = usePage().props.journal;
    const dark = variant === 'dark';

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                {indexing.map((service) => (
                    <li key={service.key}>
                        <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t('{service}: the journal’s record', {
                                service: service.label,
                            })}
                            className={cn(
                                'group flex h-11 items-center gap-2 rounded-md border px-3 no-underline transition-colors',
                                dark
                                    ? 'border-white/15 text-white hover:border-white/40 hover:bg-white/5 hover:text-white'
                                    : 'border-line-card bg-white text-ink-soft hover:border-line-strong hover:text-ink',
                            )}
                        >
                            <ServiceMark service={service} dark={dark} />
                        </a>
                    </li>
                ))}
            </ul>
            {showEbscoStatement && (
                // Verbatim from the original site, so always in English.
                <p
                    lang="en"
                    className={cn(
                        'm-0 text-meta',
                        dark ? 'text-footer-text' : 'text-ink-muted',
                    )}
                >
                    {ebscoStatement}
                </p>
            )}
        </div>
    );
}

function ServiceMark({
    service,
    dark,
}: {
    service: IndexingService;
    dark: boolean;
}) {
    // On navy, the white JPEG background is inverted to black and screened
    // away, leaving a white mono logo; on white it is multiplied away.
    const image = cn(
        'block w-auto transition-[filter,opacity]',
        dark
            ? 'opacity-90 mix-blend-screen [filter:grayscale(1)_invert(1)_brightness(1.9)] group-hover:opacity-100'
            : 'mix-blend-multiply grayscale group-hover:grayscale-0',
    );
    const wordmark = cn(
        'text-ui font-semibold tracking-[0.01em]',
        dark ? 'text-white' : 'text-ink',
    );

    if (!service.logo) {
        return (
            <>
                <DoiGlyph
                    className={dark ? 'text-footer-text' : 'text-ink-muted'}
                />
                <span className={wordmark}>{service.name}</span>
                <span className="sr-only">: {service.label}</span>
            </>
        );
    }

    // A wide logo carries its own name; a badge (square) logo gets the name
    // beside it, and on navy the badge is dropped (it does not survive mono).
    const isBadge = service.key === 'ebsco';

    if (isBadge && dark) {
        return (
            <>
                <span className={wordmark}>{service.name}</span>
                <span className="sr-only">: {service.label}</span>
            </>
        );
    }

    return (
        <>
            <img
                src={service.logo}
                alt={isBadge ? '' : `${service.name}: ${service.label}`}
                height={isBadge ? 28 : 26}
                width={isBadge ? 28 : 142}
                loading="lazy"
                decoding="async"
                className={cn(image, isBadge ? 'h-7' : 'h-[26px]')}
            />
            {isBadge && (
                <>
                    <span className={wordmark}>{service.name}</span>
                    <span className="sr-only">: {service.label}</span>
                </>
            )}
        </>
    );
}

/** A neutral "DOI" glyph for services without a logo file (Crossref). */
function DoiGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            <circle
                cx="12"
                cy="12"
                r="10.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <text
                x="12"
                y="15.2"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
                fill="currentColor"
            >
                DOI
            </text>
        </svg>
    );
}
