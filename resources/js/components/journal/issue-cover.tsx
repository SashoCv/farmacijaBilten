import { clsx as cn } from 'clsx';
import type { CSSProperties } from 'react';

type Variant = 'regular' | 'supplement' | 'archive';
type Size = 'xs' | 'sm' | 'md' | 'lg';

type Props = {
    /** Big number on the cover (the volume). */
    volume: number | string;
    /** Caption under the rule, e.g. "Volume 71, Issue 2". */
    caption: string;
    year?: number | string;
    variant?: Variant;
    size?: Size;
    className?: string;
    /**
     * URL of the printed cover (`issue.coverImage`). When set, the real cover
     * is shown; otherwise the generated card below stands in for it.
     */
    image?: string | null;
    /**
     * Accessible name, e.g. "Cover of Volume 71, Issue 2". Leave it out when
     * the cover sits inside a link or card that already names the issue: the
     * cover is then decorative.
     */
    alt?: string;
    /** Load the image eagerly with high priority (above the fold). */
    priority?: boolean;
};

/** Printed covers are A4 portrait. */
const ratio = 'aspect-[210/297]';

/**
 * Stylised journal cover, after the printed one: white page fading to sky,
 * a blue band top-right, and the volume number set large in Literata.
 */
const variants: Record<
    Variant,
    {
        background: string;
        ring: boolean;
        band: string;
        number: string;
        rule: string;
        title: string;
        mk: string;
    }
> = {
    regular: {
        background:
            'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 40%, #DCEAF7 100%)',
        ring: true,
        band: '#8DC3EA',
        number: '#2C4A8A',
        rule: '#A9BEDD',
        title: '#2C4A8A',
        mk: '#1E2A44',
    },
    supplement: {
        background: '#D6E9F8',
        ring: false,
        band: '#2C4A8A',
        number: '#1E2A44',
        rule: '#8FAED6',
        title: '#1F3770',
        mk: '#1E2A44',
    },
    archive: {
        background: '#F4F7FB',
        ring: true,
        band: '#C9D3E0',
        number: '#5B667A',
        rule: '#C9D3E0',
        title: '#5B667A',
        mk: '#5B667A',
    },
};

const sizes: Record<
    Size,
    {
        padding: string;
        radius: number;
        title: number | null;
        number: number;
        caption: number;
        gap: number;
    }
> = {
    xs: {
        padding: '8px',
        radius: 3,
        title: null,
        number: 42,
        caption: 10,
        gap: 4,
    },
    sm: {
        padding: '12px 10px',
        radius: 3,
        title: 8.5,
        number: 52,
        caption: 9.5,
        gap: 5,
    },
    md: {
        padding: '18px 16px',
        radius: 4,
        title: 11.5,
        number: 76,
        caption: 11,
        gap: 8,
    },
    lg: {
        padding: '26px 24px',
        radius: 4,
        title: 17,
        number: 120,
        caption: 13,
        gap: 12,
    },
};

export function IssueCover({
    volume,
    caption,
    year,
    variant = 'regular',
    size = 'md',
    className,
    image,
    alt,
    priority,
}: Props) {
    const s = sizes[size];

    if (image) {
        return (
            <img
                src={image}
                alt={alt ?? ''}
                width={303}
                height={426}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority ? 'high' : undefined}
                className={cn(
                    ratio,
                    'block h-auto w-full bg-mist object-cover ring-1 ring-ink/10',
                    className,
                )}
                style={{ borderRadius: s.radius }}
            />
        );
    }

    const v = variants[variant];
    const style: CSSProperties = {
        padding: s.padding,
        borderRadius: s.radius,
        background: v.background,
        boxShadow: v.ring ? 'inset 0 0 0 1px #E1E7EF' : undefined,
    };
    const named = Boolean(alt);

    return (
        <div
            role={named ? 'img' : undefined}
            aria-label={named ? alt : undefined}
            aria-hidden={named ? undefined : true}
            className={cn(
                ratio,
                'relative flex flex-col overflow-hidden font-serif select-none',
                s.title ? 'justify-between' : 'justify-end',
                className,
            )}
            style={style}
        >
            <div
                className="absolute top-0 right-0 h-[42%] w-[18%]"
                style={{ background: v.band }}
            />

            {s.title !== null && (
                // Bilingual, as on the printed cover: Macedonian first.
                <div
                    className="relative flex max-w-[76%] flex-col font-semibold"
                    style={{
                        fontSize: s.title,
                        lineHeight: 1.12,
                        gap: s.title / 4,
                    }}
                >
                    <span lang="mk" style={{ color: v.mk }}>
                        Македонски фармацевтски билтен
                    </span>
                    <span lang="en" style={{ color: v.title }}>
                        Macedonian Pharmaceutical Bulletin
                    </span>
                </div>
            )}

            <div className="relative flex flex-col" style={{ gap: s.gap }}>
                <span
                    className="font-medium tracking-[-0.03em]"
                    style={{
                        fontSize: s.number,
                        lineHeight: 0.82,
                        color: v.number,
                    }}
                >
                    {volume}
                </span>
                <div
                    className={cn(
                        'flex justify-between gap-2 font-sans text-ink-soft',
                        size !== 'xs' && 'border-t',
                    )}
                    style={{
                        fontSize: s.caption,
                        lineHeight: 1.3,
                        paddingTop: size === 'xs' ? 0 : s.gap - 2,
                        borderColor: v.rule,
                        color: variant === 'archive' ? '#5B667A' : undefined,
                    }}
                >
                    <span>{caption}</span>
                    {year && size !== 'xs' && size !== 'sm' && (
                        <span>{year}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
