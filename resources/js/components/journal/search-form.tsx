import { clsx as cn } from 'clsx';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, Ref } from 'react';
import { SearchIcon } from '@/components/journal/icons';
import { search } from '@/routes';
import { useT } from '@/lib/i18n';

type Props = {
    id: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
    /**
     * `lg` and `md`: visible label, field and a Search button.
     * `compact`: a single 44px field for the header; the label is visually
     * hidden and the submit button sits inside the field.
     */
    size?: 'lg' | 'md' | 'compact';
    autoFocus?: boolean;
    className?: string;
    inputRef?: Ref<HTMLInputElement>;
};

export function SearchForm({
    id,
    label,
    placeholder,
    defaultValue = '',
    size = 'lg',
    autoFocus,
    className,
    inputRef,
}: Props) {
    const { t } = useT();
    const [query, setQuery] = useState(defaultValue);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(search.url(), query.trim() ? { q: query.trim() } : {});
    };

    if (size === 'compact') {
        return (
            <form
                role="search"
                action={search.url()}
                onSubmit={submit}
                className={cn('relative', className)}
            >
                <label htmlFor={id} className="sr-only">
                    {label}
                </label>
                <input
                    ref={inputRef}
                    id={id}
                    name="q"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    enterKeyHint="search"
                    className="field h-11 pr-12 pl-3.5 text-ui"
                />
                <button
                    type="submit"
                    aria-label={t('Search')}
                    className="absolute top-1 right-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] bg-transparent text-ink-muted transition-colors hover:bg-tint hover:text-brand"
                >
                    <SearchIcon />
                </button>
            </form>
        );
    }

    return (
        <form
            role="search"
            action={search.url()}
            onSubmit={submit}
            className={cn('flex flex-col gap-2', className)}
        >
            <label htmlFor={id} className="text-[15px] font-semibold text-ink">
                {label}
            </label>
            <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-[1_1_300px]">
                    <SearchIcon
                        className={cn(
                            'pointer-events-none absolute left-4 text-ink-muted',
                            size === 'lg' ? 'top-[17px]' : 'top-[14px]',
                        )}
                    />
                    <input
                        ref={inputRef}
                        id={id}
                        name="q"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        enterKeyHint="search"
                        className={cn(
                            'field pr-4 pl-12',
                            size === 'lg' ? 'h-[54px]' : 'h-12',
                        )}
                    />
                </div>
                <button
                    type="submit"
                    className={cn(
                        'btn-primary px-7 max-sm:w-full',
                        size === 'lg' ? 'h-[54px] max-sm:h-12' : 'h-12',
                    )}
                >
                    {t('Search')}
                </button>
            </div>
        </form>
    );
}
