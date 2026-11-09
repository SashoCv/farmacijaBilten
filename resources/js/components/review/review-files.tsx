import { FileText, Lock, Trash2, Users } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fileSize } from '@/lib/dates';
import type { ReviewFile } from '@/types/review';

/** Review attachments: name, size, who sees it; delete while allowed. */
export function ReviewFiles({
    files,
    onDelete,
    busy,
}: {
    files: ReviewFile[];
    onDelete?: (file: ReviewFile) => void;
    busy?: string | null;
}) {
    const { t } = useT();

    if (files.length === 0) {
        return null;
    }

    return (
        <ul className="m-0 grid list-none gap-1.5 p-0">
            {files.map((file) => (
                <li
                    key={file.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm"
                >
                    <FileText
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                    />
                    <a
                        href={file.url}
                        className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline"
                        download
                    >
                        {file.name}
                    </a>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {fileSize(file.size)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {file.visibility === 'author' ? (
                            <>
                                <Users
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                                {t('Shared with the authors')}
                            </>
                        ) : (
                            <>
                                <Lock aria-hidden="true" className="size-3.5" />
                                {t('Editorial office only')}
                            </>
                        )}
                    </span>
                    {onDelete && file.deleteUrl && (
                        <button
                            type="button"
                            onClick={() => onDelete(file)}
                            disabled={busy === file.id}
                            aria-label={t('Delete {name}', { name: file.name })}
                            className="rounded p-1 text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                        >
                            <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
