import { useForm } from '@inertiajs/react';
import { FolderPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';

/** Opens a new issue "in preparation"; the server redirects to its page. */
export function NewIssueForm({
    url,
    defaults,
    onCancel,
}: {
    url: string;
    defaults: { volume: number; number: number; year: number };
    onCancel: () => void;
}) {
    const { t } = useT();
    const form = useForm({
        volume: defaults.volume,
        kind: 'issue' as 'issue' | 'supplement',
        number: defaults.number,
        year: defaults.year,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(url);
    };

    const number = (
        name: 'volume' | 'number' | 'year',
        label: string,
        min: number,
        max: number,
    ) => (
        <div className="grid gap-1.5">
            <Label htmlFor={`new-issue-${name}`}>{label}</Label>
            <Input
                id={`new-issue-${name}`}
                type="number"
                min={min}
                max={max}
                required
                value={form.data[name]}
                aria-invalid={form.errors[name] ? true : undefined}
                onChange={(e) =>
                    form.setData(name, e.target.valueAsNumber || 0)
                }
                className="w-28"
            />
            <InputError message={form.errors[name]} />
        </div>
    );

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 rounded-lg border bg-muted/30 p-4"
        >
            <div className="flex flex-wrap items-start gap-4">
                {number('volume', t('Volume'), 1, 999)}
                <div className="grid gap-1.5">
                    <Label htmlFor="new-issue-kind">{t('Kind')}</Label>
                    <select
                        id="new-issue-kind"
                        value={form.data.kind}
                        onChange={(e) =>
                            form.setData(
                                'kind',
                                e.target.value as 'issue' | 'supplement',
                            )
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                        <option value="issue">{t('Issue')}</option>
                        <option value="supplement">{t('Supplement')}</option>
                    </select>
                    <InputError message={form.errors.kind} />
                </div>
                {number('number', t('Number'), 1, 20)}
                {number('year', t('Year'), 1990, 2100)}
            </div>
            <p className="m-0 text-xs text-muted-foreground">
                {t(
                    'The issue starts "in preparation": the articles you publish in it appear on the website under Early online until you close it.',
                )}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={form.processing}>
                    <FolderPlus aria-hidden="true" />
                    {t('Open the issue')}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    {t('Cancel')}
                </Button>
            </div>
        </form>
    );
}
