import { Form } from '@inertiajs/react';
import { Wand2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';

export type PublicationDetails = {
    doi: string | null;
    volume: number | null;
    issue: string | null;
    firstPage: number | null;
    lastPage: number | null;
    year: number | null;
    doiPrefix: string;
    /** e.g. "maced.pharm.bull.{year}.{volume}.{issue}.{number}" */
    doiPattern: string;
    updateUrl: string;
};

function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id} className="text-xs">
                {label}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/**
 * DOI, volume, issue, pages and year, set by the editorial office. Printed
 * top right on the first page ("Macedonian pharmaceutical bulletin, 71 (2)
 * 3 – 11 (2025)", "DOI: …") in the preview and the Word file.
 */
export function PublicationPanel({
    details,
    placedIn = null,
}: {
    details: PublicationDetails;
    /** Label of the issue the manuscript is placed in, if any. */
    placedIn?: string | null;
}) {
    const { t } = useT();
    const [values, setValues] = useState({
        doi: details.doi ?? '',
        volume: details.volume?.toString() ?? '',
        issue: details.issue ?? '',
        first_page: details.firstPage?.toString() ?? '',
        last_page: details.lastPage?.toString() ?? '',
        publication_year: details.year?.toString() ?? '',
    });
    const [number, setNumber] = useState('');

    const set = (key: keyof typeof values) => (value: string) =>
        setValues((current) => ({ ...current, [key]: value }));

    const canSuggest =
        /^\d+$/.test(values.publication_year) &&
        /^\d+$/.test(values.volume) &&
        /^\d+$/.test(values.issue) &&
        /^\d+$/.test(number);

    const suggest = () => {
        const suffix = details.doiPattern
            .replace('{year}', values.publication_year)
            .replace('{volume}', values.volume)
            .replace('{issue}', values.issue.padStart(2, '0'))
            .replace('{number}', number.padStart(3, '0'));

        set('doi')(`${details.doiPrefix}/${suffix}`);
    };

    return (
        <Form
            action={details.updateUrl}
            method="put"
            options={{ preserveScroll: true }}
            className="grid gap-3"
        >
            {({ processing, errors }) => (
                <>
                    {/* Volume, issue and year come from the issue the
                        manuscript is placed in (Issue and publishing). */}
                    {placedIn ? (
                        <p className="m-0 rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                                {t('Issue')}:
                            </span>{' '}
                            <span className="font-medium">
                                {placedIn}
                                {values.publication_year &&
                                    ` (${values.publication_year})`}
                            </span>
                        </p>
                    ) : (
                        <p className="m-0 text-sm text-muted-foreground">
                            {t(
                                'Volume, issue and year are filled in when the manuscript is placed in an issue (above).',
                            )}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <Field
                            id="pub-first"
                            label={t('First page')}
                            error={errors.first_page}
                        >
                            <Input
                                id="pub-first"
                                name="first_page"
                                inputMode="numeric"
                                value={values.first_page}
                                onChange={(e) =>
                                    set('first_page')(e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            id="pub-last"
                            label={t('Last page')}
                            error={errors.last_page}
                        >
                            <Input
                                id="pub-last"
                                name="last_page"
                                inputMode="numeric"
                                value={values.last_page}
                                onChange={(e) =>
                                    set('last_page')(e.target.value)
                                }
                            />
                        </Field>
                    </div>

                    <p className="m-0 -mt-1 text-xs text-muted-foreground">
                        {t(
                            'The pages of the article in the printed issue, e.g. 3 and 11: printed as “71 (2) 3 – 11 (2025)” on the article and in citations.',
                        )}
                    </p>

                    <Field id="pub-doi" label="DOI" error={errors.doi}>
                        <Input
                            id="pub-doi"
                            name="doi"
                            value={values.doi}
                            onChange={(e) => set('doi')(e.target.value)}
                            placeholder={`${details.doiPrefix}/…`}
                            className="font-mono text-xs"
                        />
                    </Field>

                    <div className="flex items-end gap-2">
                        <div className="grid w-24 gap-1.5">
                            <Label htmlFor="pub-number" className="text-xs">
                                {t('Article no.')}
                            </Label>
                            <Input
                                id="pub-number"
                                inputMode="numeric"
                                placeholder="001"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canSuggest}
                            onClick={suggest}
                            title={t(
                                'Place the manuscript in an issue and enter the article number first.',
                            )}
                        >
                            <Wand2 aria-hidden="true" />
                            {t('Suggest DOI')}
                        </Button>
                    </div>
                    <p className="m-0 text-xs break-all text-muted-foreground">
                        {t('Journal pattern: {pattern}', {
                            pattern: `${details.doiPrefix}/${details.doiPattern}`,
                        })}
                    </p>

                    <Button type="submit" disabled={processing}>
                        {t('Save publication details')}
                    </Button>
                </>
            )}
        </Form>
    );
}
