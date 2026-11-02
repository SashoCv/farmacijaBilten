import { router } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SearchIcon } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';
import { search } from '@/routes';

/**
 * The home page's search field (the header shows no search on home).
 * One row: field and button, with the label kept for screen
 * readers and the hint shown as the placeholder.
 */
export function HeroSearch({ className }: { className?: string }) {
    const { t } = useT();
    const [query, setQuery] = useState('');

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(search.url(), query.trim() ? { q: query.trim() } : {});
    };

    return (
        <form
            role="search"
            action={search.url()}
            onSubmit={submit}
            className={cn('flex gap-2', className)}
        >
            <label htmlFor="hero-search" className="sr-only">
                {t('Search articles, authors and keywords')}
            </label>
            <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
                <input
                    id="hero-search"
                    name="q"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('Title, author or keyword')}
                    className="field h-12 pr-4 pl-12"
                />
            </div>
            <button type="submit" className="btn-primary h-12 px-6">
                {t('Search')}
            </button>
        </form>
    );
}
