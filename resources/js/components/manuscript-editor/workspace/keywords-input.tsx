import { X } from 'lucide-react';
import { useId, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { issueId } from './context';
import { FieldIssues } from './field-issues';

type Props = {
    field: string;
    /** Printed label ("Key words", "Клучни зборови"). */
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    min: number;
    max: number;
    lang: string;
};

function split(text: string): string[] {
    return text
        .split(/[,;\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
}

/**
 * Key words as the journal prints them ("Key words: a, b, c"): chips in the
 * order of importance, typed one by one (Enter or comma adds one; a pasted
 * list is split at commas).
 */
export function KeywordsInput({
    field,
    label,
    value,
    onChange,
    min,
    max,
    lang,
}: Props) {
    const { t } = useT();
    const id = useId();
    const [draft, setDraft] = useState('');

    const add = (words: string[]) => {
        const next = [...value];

        for (const word of words) {
            if (
                next.length < max &&
                !next.some((k) => k.toLowerCase() === word.toLowerCase())
            ) {
                next.push(word.slice(0, 80));
            }
        }

        if (next.length !== value.length) {
            onChange(next);
        }
    };

    const commit = () => {
        const words = split(draft);

        if (words.length > 0) {
            add(words);
        }

        setDraft('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
            event.preventDefault();
            commit();
        } else if (
            event.key === 'Backspace' &&
            draft === '' &&
            value.length > 0
        ) {
            event.preventDefault();
            setDraft(value[value.length - 1]);
            onChange(value.slice(0, -1));
        }
    };

    const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const text = event.clipboardData.getData('text');

        if (/[,;\n]/.test(text)) {
            event.preventDefault();
            add(split(draft + text));
            setDraft('');
        }
    };

    const move = (index: number, by: number) => {
        const next = [...value];
        const [word] = next.splice(index, 1);
        next.splice(index + by, 0, word);
        onChange(next);
    };

    const full = value.length >= max;

    return (
        <div data-field={field} className="ms-ed-keywords">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <label htmlFor={id} className="ms-ed-keywords-label">
                    {label}:
                </label>
                <ul
                    className="ms-ui inline-flex flex-wrap gap-1"
                    aria-label={t('Key words in order of importance')}
                >
                    {value.map((word, index) => (
                        <li
                            key={word}
                            className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-slate-50 py-0.5 pr-0.5 pl-2 text-[13px] text-slate-900"
                        >
                            <span lang={lang} className="font-serif">
                                {word}
                            </span>
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() => move(index, -1)}
                                    aria-label={t(
                                        'Move key word "{word}" earlier',
                                        { word },
                                    )}
                                    title={t('Move earlier')}
                                    className="rounded px-1 text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-[#2c4a8a]"
                                >
                                    ‹
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(value.filter((k) => k !== word))
                                }
                                aria-label={t('Remove key word "{word}"', {
                                    word,
                                })}
                                className="rounded p-0.5 text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-[#2c4a8a]"
                            >
                                <X aria-hidden="true" className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
                <input
                    id={id}
                    lang={lang}
                    value={draft}
                    disabled={full}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    onBlur={commit}
                    aria-describedby={`${id}-hint ${issueId(field)}`}
                    placeholder={
                        full
                            ? t('Maximum reached')
                            : t('Type a key word, then Enter')
                    }
                    className={cn(
                        'ms-ui min-w-[12rem] flex-1 rounded border border-dashed border-slate-300 bg-transparent px-2 py-0.5 text-[13px] placeholder:text-slate-500 focus-visible:border-solid focus-visible:border-[#2c4a8a] focus-visible:outline-none disabled:opacity-60',
                    )}
                />
            </div>
            <p
                id={`${id}-hint`}
                className={cn(
                    'ms-ui mt-1 text-xs',
                    value.length > 0 && value.length < min
                        ? 'text-amber-800'
                        : 'text-slate-600',
                )}
            >
                {t(
                    '{min}–{max} key words, the most important first ({count} so far).',
                    { min, max, count: value.length },
                )}
            </p>
            <FieldIssues field={field} />
        </div>
    );
}
