import { useForm } from '@inertiajs/react';
import { FileText, Globe } from 'lucide-react';
import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';

/**
 * "Publish online", confirmed in a dialog. The PDF is made from the
 * manuscript in the journal layout (POST without a file); the editors may
 * upload their own final PDF instead (POST multipart { pdf }).
 */
export function PublishOnline({
    url,
    pdfUrl,
}: {
    url: string;
    /** The PDF the system will make, to check before publishing. */
    pdfUrl: string;
}) {
    const { t } = useT();
    const id = useId();
    const [confirming, setConfirming] = useState(false);
    const [ownPdf, setOwnPdf] = useState(false);
    const form = useForm<{ pdf: File | null }>({ pdf: null });

    const publish = () =>
        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setConfirming(false),
        });

    const toggleOwn = (checked: boolean) => {
        setOwnPdf(checked);

        if (!checked) {
            form.setData('pdf', null);
        }
    };

    return (
        <div className="grid gap-2">
            <p className="m-0 text-xs text-muted-foreground">
                {t(
                    'The PDF is made automatically from the manuscript, in the journal layout, with the page numbers, DOI and citation.',
                )}
            </p>

            <a
                href={pdfUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
                <FileText aria-hidden="true" className="size-4" />
                {t('Preview the PDF')}
            </a>

            <label className="flex items-center gap-2 text-xs">
                <input
                    type="checkbox"
                    checked={ownPdf}
                    onChange={(e) => toggleOwn(e.target.checked)}
                    className="size-4 rounded border-input"
                />
                {t('Upload our own final PDF instead')}
            </label>

            {ownPdf && (
                <div className="grid gap-1.5">
                    <label
                        htmlFor={`${id}-pdf`}
                        className="text-xs font-medium"
                    >
                        {t('Final PDF')}
                    </label>
                    <input
                        id={`${id}-pdf`}
                        type="file"
                        accept="application/pdf,.pdf"
                        aria-invalid={form.errors.pdf ? true : undefined}
                        onChange={(e) =>
                            form.setData('pdf', e.target.files?.[0] ?? null)
                        }
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
                    />
                </div>
            )}
            <InputError message={form.errors.pdf} />

            <Button
                type="button"
                size="sm"
                className="w-fit"
                disabled={(ownPdf && !form.data.pdf) || form.processing}
                onClick={() => setConfirming(true)}
            >
                <Globe aria-hidden="true" />
                {t('Publish online…')}
            </Button>

            <Dialog
                open={confirming}
                onOpenChange={(open) => !form.processing && setConfirming(open)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>
                        {t('Publish this article online?')}
                    </DialogTitle>
                    <DialogDescription>
                        {form.data.pdf
                            ? t(
                                  'The article will appear on the website under Early online with this PDF; the authors are notified.',
                              )
                            : t(
                                  'The PDF is made from the manuscript and the article appears on the website under Early online; the authors are notified. Making the PDF takes a few seconds.',
                              )}
                    </DialogDescription>
                    {form.data.pdf && (
                        <p className="m-0 text-sm">
                            {t('File: {name}', { name: form.data.pdf.name })}
                        </p>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={form.processing}
                            onClick={() => setConfirming(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button disabled={form.processing} onClick={publish}>
                            {form.processing
                                ? t('Publishing…')
                                : t('Publish online')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
