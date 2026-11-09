import { useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import type { AdminNotes as Notes } from '@/types/review';

/** Internal notes of the editorial office: never shown to authors or reviewers. */
export function AdminNotes({ notes }: { notes: Notes }) {
    const { t } = useT();
    const { dateTime } = useDates();
    const form = useForm({ body: '', visible_to_author: false });
    const items = [...notes.items].sort((a, b) => b.at.localeCompare(a.at));

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(notes.url, {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    return (
        <section
            id="notes"
            aria-labelledby="notes-heading"
            className="scroll-mt-4 rounded-xl border bg-card p-4"
        >
            <h2
                id="notes-heading"
                className="m-0 mb-1 flex items-center gap-1.5 text-sm font-semibold"
            >
                <Lock aria-hidden="true" className="size-3.5" />
                {t('Notes')}
            </h2>
            <p className="m-0 mb-3 text-xs text-muted-foreground">
                {t(
                    'Internal unless you send a note to the authors; reviewers never see notes.',
                )}
            </p>
            <form onSubmit={submit} className="grid gap-2">
                <label htmlFor="note-body" className="sr-only">
                    {t('New note')}
                </label>
                <textarea
                    id="note-body"
                    rows={3}
                    value={form.data.body}
                    placeholder={t('Write a note for the editorial office…')}
                    aria-invalid={form.errors.body ? true : undefined}
                    onChange={(event) =>
                        form.setData('body', event.target.value)
                    }
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <InputError message={form.errors.body} />
                <fieldset className="m-0 flex flex-wrap gap-x-4 gap-y-1 border-0 p-0 text-sm">
                    <legend className="sr-only">
                        {t('Who sees this note')}
                    </legend>
                    <label className="inline-flex items-center gap-1.5">
                        <input
                            type="radio"
                            name="note-visibility"
                            checked={!form.data.visible_to_author}
                            onChange={() =>
                                form.setData('visible_to_author', false)
                            }
                            className="size-4 accent-[#2c4a8a]"
                        />
                        {t('Only the editorial office')}
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                        <input
                            type="radio"
                            name="note-visibility"
                            checked={form.data.visible_to_author}
                            onChange={() =>
                                form.setData('visible_to_author', true)
                            }
                            className="size-4 accent-[#2c4a8a]"
                        />
                        {t('Send to the authors (by e-mail)')}
                    </label>
                </fieldset>
                <Button
                    type="submit"
                    size="sm"
                    className="w-fit"
                    disabled={form.processing || form.data.body.trim() === ''}
                >
                    {form.data.visible_to_author
                        ? t('Send to the authors')
                        : t('Add note')}
                </Button>
            </form>
            {items.length > 0 && (
                <ol className="m-0 mt-4 grid list-none gap-3 p-0 text-sm">
                    {items.map((note) => (
                        <li
                            key={note.id}
                            className="border-l-2 border-border pl-3"
                        >
                            <p className="m-0 whitespace-pre-line">
                                {note.body}
                            </p>
                            <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                                {dateTime(note.at)}
                                {note.author && ` · ${note.author}`}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
