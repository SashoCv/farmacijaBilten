import { FileDown, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';

export type PreviewState =
    | { kind: 'closed' }
    | { kind: 'loading' }
    | { kind: 'ready'; html: string }
    | { kind: 'failed' };

/**
 * The article as the server renders it (the same HTML as the read-only page
 * and, later, the PDF), on a sheet of paper.
 */
export function PreviewDialog({
    state,
    onClose,
    onRetry,
    lang,
    docxUrl,
}: {
    state: PreviewState;
    onClose: () => void;
    onRetry: () => void;
    lang: string;
    /** The same version as a Word file in the journal's layout. */
    docxUrl: string;
}) {
    const { t } = useT();

    return (
        <Dialog
            open={state.kind !== 'closed'}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="flex h-[94svh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,232mm)]">
                <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base">
                            {t('Preview')}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {t(
                                'The last saved version, as the journal will print it (one column).',
                            )}
                        </DialogDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <a href={docxUrl} download>
                            <FileDown aria-hidden="true" />
                            {t('Download Word (.docx)')}
                        </a>
                    </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {state.kind === 'loading' && (
                        <p
                            role="status"
                            className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"
                        >
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                            />
                            {t('Saving and preparing the preview…')}
                        </p>
                    )}
                    {state.kind === 'failed' && (
                        <div
                            role="alert"
                            className="grid justify-items-center gap-3 p-10 text-sm"
                        >
                            <p className="m-0">
                                {t(
                                    'The preview could not be loaded. Check your connection and try again.',
                                )}
                            </p>
                            <Button variant="outline" onClick={onRetry}>
                                {t('Try again')}
                            </Button>
                        </div>
                    )}
                    {state.kind === 'ready' && (
                        <div className="ms-desk min-h-full">
                            <div
                                data-preview-sheet=""
                                lang={lang}
                                className="ms ms-paper"
                                // Sanitised on the server (ManuscriptRenderer).
                                dangerouslySetInnerHTML={{ __html: state.html }}
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
