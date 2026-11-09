import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { useT } from '@/lib/i18n';

type Props = Omit<ComponentProps<'select'>, 'children'> & {
    /** ISO 3166-1 alpha-2 codes from the server (App\Support\Countries). */
    codes: string[];
};

/**
 * Country picker: names in the reader's language from the browser
 * (Intl.DisplayNames), sorted alphabetically, North Macedonia first.
 */
export function CountrySelect({ codes, className, ...props }: Props) {
    const { t, locale } = useT();

    const options = useMemo(() => {
        const tag = locale === 'mk' ? 'mk' : 'en';
        let names: Intl.DisplayNames | null = null;

        try {
            names = new Intl.DisplayNames([tag], { type: 'region' });
        } catch {
            names = null;
        }

        const collator = new Intl.Collator(tag);

        return codes
            .map((code) => ({ code, name: names?.of(code) ?? code }))
            .sort((a, b) =>
                a.code === 'MK'
                    ? -1
                    : b.code === 'MK'
                      ? 1
                      : collator.compare(a.name, b.name),
            );
    }, [codes, locale]);

    return (
        <select className={className ?? 'field h-11 px-3'} {...props}>
            <option value="" disabled>
                {t('Choose a country')}
            </option>
            {options.map((option) => (
                <option key={option.code} value={option.code}>
                    {option.name}
                </option>
            ))}
        </select>
    );
}
