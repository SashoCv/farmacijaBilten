import { Link, router, usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import {
    ChevronDown,
    CloseIcon,
    LogoMark,
    MenuIcon,
    SearchIcon,
} from '@/components/journal/icons';
import { SearchForm } from '@/components/journal/search-form';
import { useT } from '@/lib/i18n';
import {
    aboutLinks,
    authorLinks,
    isActiveHref,
    submitHref,
} from '@/lib/site-links';
import type { SiteLink } from '@/lib/site-links';
import { archive, earlyOnline, home } from '@/routes';
import { show as showIssue } from '@/routes/issues';

type NavGroup = { key: 'authors' | 'about'; label: string; items: SiteLink[] };

const forAuthors: NavGroup = {
    key: 'authors',
    label: 'For authors',
    items: authorLinks,
};
const about: NavGroup = { key: 'about', label: 'About', items: aboutLinks };

/** Id of the home page's hero search field; the header defers to it on home. */
const HERO_SEARCH_ID = 'hero-search';

/** Height of the utility bar plus masthead, scrolled away above the sticky nav row. */
const STICKY_OFFSET = 106;

type Section = 'current' | 'archive' | 'early' | 'authors' | 'about' | null;

/** Which top-level navigation item the current page belongs to. */
function useSection(): Section {
    const { component, url, props } = usePage<{
        issue?: { isCurrent?: boolean; isPublished?: boolean };
    }>();

    switch (component) {
        case 'journal/archive':
            return 'archive';
        case 'journal/early-online':
            return 'early';
        case 'journal/issue':
        case 'journal/article': {
            const issue = props.issue;

            if (!issue) {
                return null;
            }

            if (issue.isCurrent) {
                return 'current';
            }

            return issue.isPublished === false ? 'early' : 'archive';
        }
    }

    if (
        url.startsWith('/guidelines') ||
        isActiveHref(url, submitHref) ||
        authorLinks.some((link) => isActiveHref(url, link.href))
    ) {
        return 'authors';
    }

    return aboutLinks.some((link) => isActiveHref(url, link.href))
        ? 'about'
        : null;
}

/**
 * Below lg the header hides while reading down and returns on scroll-up;
 * from lg only the nav row stays (the header sticks at -106px).
 */
function useScrollState(enabled: boolean) {
    const [state, setState] = useState({ hidden: false, scrolled: false });

    useEffect(() => {
        let last = window.scrollY;
        let frame = 0;

        const update = () => {
            frame = 0;
            const y = window.scrollY;
            const delta = y - last;
            last = y;

            setState((prev) => {
                const scrolled = y > STICKY_OFFSET;
                let hidden = prev.hidden;

                if (!enabled || y < 120) {
                    hidden = false;
                } else if (delta > 6) {
                    hidden = true;
                } else if (delta < -6) {
                    hidden = false;
                }

                return prev.hidden === hidden && prev.scrolled === scrolled
                    ? prev
                    : { hidden, scrolled };
            });
        };

        const onScroll = () => {
            if (!frame) {
                frame = requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(frame);
        };
    }, [enabled]);

    return {
        ...state,
        reveal: () =>
            setState((prev) =>
                prev.hidden ? { ...prev, hidden: false } : prev,
            ),
    };
}

/** Moves focus to the home page's own search field. Returns false if absent. */
function focusHeroSearch(): boolean {
    const field = document.getElementById(HERO_SEARCH_ID);

    if (!(field instanceof HTMLElement)) {
        return false;
    }

    const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches;
    field.scrollIntoView({
        block: 'center',
        behavior: reduce ? 'auto' : 'smooth',
    });
    field.focus({ preventScroll: true });

    return true;
}

export function SiteHeader() {
    const { t, locale } = useT();
    const { component, props } = usePage();
    const { currentIssueSlug, journal } = props;
    const section = useSection();
    const isHome = component === 'journal/home';

    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { hidden, scrolled, reveal } = useScrollState(
        !menuOpen && !searchOpen,
    );

    const menuToggle = useRef<HTMLButtonElement>(null);
    const searchToggle = useRef<HTMLButtonElement>(null);

    // Close panels whenever Inertia navigates.
    useEffect(
        () =>
            router.on('navigate', () => {
                setMenuOpen(false);
                setSearchOpen(false);
            }),
        [],
    );

    // Escape closes the search panel and returns focus to its toggle.
    useEffect(() => {
        if (!searchOpen) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSearchOpen(false);
                searchToggle.current?.focus();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [searchOpen]);

    const currentIssueHref = currentIssueSlug
        ? showIssue.url(currentIssueSlug)
        : archive.url();
    const name = locale === 'mk' ? journal.nameMk : journal.nameEn;
    const otherName = locale === 'mk' ? journal.nameEn : journal.nameMk;

    const primary: { key: Section; label: string; href: string }[] = [
        { key: 'current', label: t('Current issue'), href: currentIssueHref },
        { key: 'archive', label: t('Archive'), href: archive.url() },
        { key: 'early', label: t('Early online'), href: earlyOnline.url() },
    ];

    const onSearchToggle = () => {
        // On home, the hero already has a search field: never open a second one.
        if (isHome && focusHeroSearch()) {
            setSearchOpen(false);
            setMenuOpen(false);

            return;
        }

        setSearchOpen((open) => !open);
        setMenuOpen(false);
    };

    return (
        <>
            <header
                onFocus={reveal}
                className={cn(
                    'z-40 border-b border-line bg-white print:static',
                    'sticky top-0 transition-[transform,box-shadow] duration-200 motion-reduce:transition-none md:max-lg:-top-9 lg:-top-[106px]',
                    hidden && 'max-lg:-translate-y-full',
                    scrolled &&
                        'shadow-[0_10px_24px_-20px_rgba(22,38,77,0.45)]',
                )}
            >
                {/* Utility bar: publishers and language. */}
                <div className="on-navy hidden h-9 bg-brand-dark text-meta text-white md:block">
                    <div className="page-wrap flex h-full items-center justify-between gap-6">
                        <p className="m-0 min-w-0 truncate text-white/90">
                            <a
                                href={journal.publisher.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/90 no-underline hover:text-white hover:underline"
                            >
                                {locale === 'mk'
                                    ? journal.publisher.nameMk
                                    : journal.publisher.nameEn}
                            </a>
                            <span
                                aria-hidden="true"
                                className="mx-2 text-white/50"
                            >
                                ·
                            </span>
                            <a
                                href={journal.coPublisher.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/90 no-underline hover:text-white hover:underline"
                            >
                                {t('Faculty of Pharmacy, UKIM Skopje')}
                            </a>
                        </p>
                        <LanguageSwitch variant="bar" />
                    </div>
                </div>

                {/* Masthead */}
                <div className="page-wrap flex h-14 items-center gap-2 md:h-[70px] md:gap-4 lg:gap-6">
                    <Link
                        href={home()}
                        className="mr-auto flex min-w-0 items-center gap-2.5 text-ink no-underline hover:text-ink md:gap-3.5"
                    >
                        <LogoMark className="size-8 shrink-0 text-brand-dark md:size-11" />
                        <span className="flex min-w-0 flex-col">
                            <span
                                lang={locale}
                                className="font-serif text-[15px] leading-[1.15] font-semibold tracking-[-0.01em] text-ink sm:text-lg md:text-[22px] md:whitespace-nowrap xl:text-[26px]"
                            >
                                {name}
                            </span>
                            <span
                                lang={locale === 'mk' ? 'en' : 'mk'}
                                className="mt-1 hidden text-meta leading-none tracking-[0.06em] whitespace-nowrap text-ink-muted uppercase md:block"
                            >
                                {otherName}
                            </span>
                        </span>
                    </Link>

                    <div className="hidden w-[clamp(200px,22vw,320px)] shrink lg:block">
                        {isHome ? (
                            <HeroSearchShortcut />
                        ) : (
                            <SearchForm
                                id="header-search"
                                size="compact"
                                label={t('Search the journal')}
                                placeholder={t('Search articles, authors…')}
                            />
                        )}
                    </div>

                    <Link
                        href={submitHref}
                        className="btn-primary hidden whitespace-nowrap lg:inline-flex"
                    >
                        {t('Submit manuscript')}
                    </Link>

                    <button
                        ref={searchToggle}
                        type="button"
                        aria-label={
                            searchOpen
                                ? t('Close search')
                                : t('Search the journal')
                        }
                        aria-expanded={isHome ? undefined : searchOpen}
                        aria-controls={isHome ? undefined : 'site-search'}
                        onClick={onSearchToggle}
                        className="btn-icon border-transparent lg:hidden"
                    >
                        {searchOpen ? <CloseIcon /> : <SearchIcon />}
                    </button>
                    <button
                        ref={menuToggle}
                        type="button"
                        aria-label={t('Open menu')}
                        aria-expanded={menuOpen}
                        aria-controls="site-menu"
                        aria-haspopup="dialog"
                        onClick={() => {
                            setMenuOpen(true);
                            setSearchOpen(false);
                        }}
                        className="btn-icon border-transparent lg:hidden"
                    >
                        <MenuIcon />
                    </button>
                </div>

                {/* Navigation row: the part that stays on screen from lg. */}
                <div className="hidden border-t border-line lg:block">
                    <nav aria-label={t('Main')} className="page-wrap">
                        <ul className="m-0 flex h-[52px] list-none items-stretch gap-x-8 p-0">
                            {primary.map((item) => (
                                <li key={item.key} className="flex">
                                    <Link
                                        href={item.href}
                                        prefetch={item.key === 'current'}
                                        aria-current={
                                            section === item.key
                                                ? 'page'
                                                : undefined
                                        }
                                        className={navItemClass(
                                            section === item.key,
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                            {[forAuthors, about].map((group) => (
                                <li key={group.key} className="flex">
                                    <NavDropdown
                                        group={group}
                                        active={section === group.key}
                                    />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {searchOpen && (
                    <div
                        id="site-search"
                        className="border-t border-line bg-mist lg:hidden"
                    >
                        <SearchForm
                            id="header-search-panel"
                            label={t('Search articles, authors and keywords')}
                            placeholder={t(
                                'e.g. HPLC, pharmacokinetics, Dimovski',
                            )}
                            size="md"
                            autoFocus
                            className="page-wrap py-5"
                        />
                    </div>
                )}
            </header>

            {menuOpen && (
                <MobileMenu
                    currentIssueHref={currentIssueHref}
                    section={section}
                    onClose={() => {
                        setMenuOpen(false);
                        menuToggle.current?.focus();
                    }}
                />
            )}
        </>
    );
}

function navItemClass(active: boolean): string {
    return cn(
        'relative flex cursor-pointer items-center gap-1.5 bg-transparent text-[15px] font-semibold whitespace-nowrap no-underline transition-colors',
        "after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:content-['']",
        active
            ? 'text-brand-dark after:bg-brand-dark hover:text-brand-dark'
            : 'text-ink after:bg-transparent hover:text-brand hover:after:bg-line-strong',
    );
}

/**
 * On home, the masthead shows a field-shaped button that takes the reader to
 * the hero search, so the page never has two search forms.
 */
function HeroSearchShortcut() {
    const { t } = useT();

    return (
        <button
            type="button"
            onClick={() => {
                if (!focusHeroSearch()) {
                    router.visit('/search');
                }
            }}
            className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-field bg-white pr-3 pl-3.5 text-left text-ui text-ink-muted transition-colors hover:border-brand"
        >
            <span className="truncate">{t('Search articles, authors…')}</span>
            <SearchIcon className="shrink-0" />
        </button>
    );
}

/**
 * Disclosure-style dropdown (button + list of links): the recommended pattern
 * for site navigation, and far lighter than a full ARIA menu.
 */
function NavDropdown({ group, active }: { group: NavGroup; active: boolean }) {
    const { t } = useT();
    const { url } = usePage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointer = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                ref.current?.querySelector('button')?.focus();
            }
        };

        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div
            ref={ref}
            className="relative flex"
            onBlur={(event) => {
                if (
                    !ref.current?.contains(event.relatedTarget as Node | null)
                ) {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((value) => !value)}
                className={cn(navItemClass(active), open && 'text-brand')}
            >
                {t(group.label)}
                <ChevronDown
                    className={cn(
                        'text-ink-muted transition-transform motion-reduce:transition-none',
                        open && 'rotate-180',
                    )}
                />
            </button>
            <ul
                id={listId}
                hidden={!open}
                className="absolute top-full left-[-12px] z-50 m-0 mt-px min-w-64 list-none rounded-b-lg border border-t-0 border-line-card bg-white p-1.5 shadow-[0_18px_40px_-24px_rgba(22,38,77,0.45)]"
            >
                {group.items.map((item) => {
                    const current = isActiveHref(url, item.href);

                    return (
                        <li key={`${item.href}-${item.label}`}>
                            <Link
                                href={item.href}
                                aria-current={current ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    'block rounded-md px-3 py-2 text-ui whitespace-nowrap no-underline hover:bg-mist hover:text-brand-dark focus-visible:bg-mist',
                                    current
                                        ? 'font-semibold text-brand-dark'
                                        : 'text-ink',
                                )}
                            >
                                {t(item.label)}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** Full-height menu sheet below lg: language first, links, Submit pinned last. */
function MobileMenu({
    currentIssueHref,
    section,
    onClose,
}: {
    currentIssueHref: string;
    section: Section;
    onClose: () => void;
}) {
    const { t, locale } = useT();
    const { url, props } = usePage();
    const dialog = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    const close = useEffectEvent(() => onClose());

    useEffect(() => {
        closeButton.current?.focus();

        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        const desktop = window.matchMedia('(min-width: 64rem)');
        const onResize = () => desktop.matches && close();

        document.addEventListener('keydown', onKey);
        desktop.addEventListener('change', onResize);

        return () => {
            root.style.overflow = previous;
            document.removeEventListener('keydown', onKey);
            desktop.removeEventListener('change', onResize);
        };
    }, []);

    // Keep Tab inside the sheet while it is open (it is modal).
    const trapFocus = (event: ReactKeyboardEvent) => {
        if (event.key !== 'Tab' || !dialog.current) {
            return;
        }

        const focusable = dialog.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const primary: { key: Section; label: string; href: string }[] = [
        { key: 'current', label: t('Current issue'), href: currentIssueHref },
        { key: 'archive', label: t('Archive'), href: archive.url() },
        { key: 'early', label: t('Early online'), href: earlyOnline.url() },
    ];

    return (
        <div
            ref={dialog}
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={trapFocus}
            className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden"
        >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 md:h-[70px]">
                <span className="flex min-w-0 items-center gap-2.5">
                    <LogoMark className="size-8 shrink-0 text-brand-dark" />
                    <span
                        id={titleId}
                        lang={locale}
                        className="line-clamp-2 font-serif text-[15px] leading-tight font-semibold text-ink"
                    >
                        {locale === 'mk'
                            ? props.journal.nameMk
                            : props.journal.nameEn}
                    </span>
                </span>
                <button
                    ref={closeButton}
                    type="button"
                    aria-label={t('Close menu')}
                    onClick={onClose}
                    className="btn-icon border-transparent"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="shrink-0 border-b border-line px-4 py-3">
                <LanguageSwitch variant="sheet" />
            </div>

            <nav
                aria-label={t('Main')}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6"
            >
                <ul className="m-0 list-none p-0">
                    {primary.map((item) => (
                        <li key={item.key}>
                            <SheetLink
                                href={item.href}
                                current={section === item.key}
                                strong
                            >
                                {item.label}
                            </SheetLink>
                        </li>
                    ))}
                </ul>
                {[forAuthors, about].map((group) => (
                    <div key={group.key} className="pt-5">
                        <p className="eyebrow mb-1 text-ink-muted">
                            {t(group.label)}
                        </p>
                        <ul className="m-0 list-none p-0">
                            {group.items.map((item) => (
                                <li key={`${item.href}-${item.label}`}>
                                    <SheetLink
                                        href={item.href}
                                        current={isActiveHref(url, item.href)}
                                    >
                                        {t(item.label)}
                                    </SheetLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="shrink-0 border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Link href={submitHref} className="btn-primary h-12 w-full">
                    {t('Submit manuscript')}
                </Link>
            </div>
        </div>
    );
}

function SheetLink({
    href,
    current,
    strong,
    children,
}: {
    href: string;
    current: boolean;
    strong?: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
                'flex items-center border-b border-line no-underline',
                strong ? 'min-h-[52px] text-[17px]' : 'min-h-11 text-base',
                current
                    ? 'pl-3 font-semibold text-brand-dark shadow-[inset_3px_0_0_var(--color-brand-dark)]'
                    : strong
                      ? 'font-semibold text-ink'
                      : 'text-ink',
            )}
        >
            {children}
        </Link>
    );
}

/**
 * EN | МК. A full page load, so the server renders in the new language.
 * `bar`: compact, white on the navy utility bar. `sheet`: two equal buttons.
 */
function LanguageSwitch({ variant }: { variant: 'bar' | 'sheet' }) {
    const { t, locale } = useT();
    const options = [
        { code: 'en', short: 'EN', label: 'English' },
        { code: 'mk', short: 'МК', label: 'Македонски' },
    ] as const;

    if (variant === 'sheet') {
        return (
            <nav aria-label={t('Language')}>
                <ul className="m-0 grid list-none grid-cols-2 gap-1 rounded-md bg-mist p-1">
                    {options.map((option) => {
                        const current = locale === option.code;

                        return (
                            <li key={option.code}>
                                <a
                                    href={`/locale/${option.code}`}
                                    rel="nofollow"
                                    lang={option.code}
                                    hrefLang={option.code}
                                    aria-current={current ? 'true' : undefined}
                                    className={cn(
                                        'flex h-11 items-center justify-center rounded-[5px] text-ui no-underline',
                                        current
                                            ? 'bg-white font-semibold text-brand-dark shadow-[0_1px_2px_rgba(22,38,77,0.15)]'
                                            : 'text-ink-soft hover:text-brand',
                                    )}
                                >
                                    {option.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        );
    }

    return (
        <nav aria-label={t('Language')} className="shrink-0">
            <ul className="m-0 flex list-none items-center p-0">
                {options.map((option, index) => {
                    const current = locale === option.code;

                    return (
                        <li key={option.code} className="flex items-center">
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="px-1 text-white/40"
                                >
                                    |
                                </span>
                            )}
                            <a
                                href={`/locale/${option.code}`}
                                rel="nofollow"
                                lang={option.code}
                                hrefLang={option.code}
                                aria-current={current ? 'true' : undefined}
                                className={cn(
                                    'inline-flex h-9 items-center px-1.5 tracking-[0.04em] no-underline',
                                    current
                                        ? 'font-semibold text-white underline decoration-sky decoration-2 underline-offset-[6px] hover:text-white'
                                        : 'text-white/75 hover:text-white hover:underline',
                                )}
                            >
                                {option.short}
                                <span className="sr-only"> {option.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
