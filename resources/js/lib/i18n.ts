import { usePage } from '@inertiajs/react';
import mk from '@/lang/mk';

export type Locale = 'en' | 'mk';

type Vars = Record<string, string | number>;

const dictionaries: Record<Locale, Record<string, string>> = { en: {}, mk };

/**
 * Translates an English interface string. The English text is the key, so a
 * missing translation simply shows English. Placeholders look like {count}.
 */
export function translate(locale: Locale, text: string, vars?: Vars): string {
    const out = dictionaries[locale][text] ?? text;

    return vars
        ? out.replace(/\{(\w+)\}/g, (match, name: string) =>
              name in vars ? String(vars[name]) : match,
          )
        : out;
}

/** `t` bound to the reader's language (set by the server from the "locale" cookie). */
export function useT() {
    const { locale } = usePage().props;

    return {
        locale,
        t: (text: string, vars?: Vars) => translate(locale, text, vars),
    };
}
