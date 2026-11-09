import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { CircleAlert, ImageUp, LoaderCircle, Trash2 } from 'lucide-react';
import { useId, useRef } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FIGURE_TYPES, FIGURE_WIDTHS } from './extensions/figure-shared';
import type { FigureOptions, FigureWidth } from './extensions/figure-shared';
import { finishUpload, useUpload } from './extensions/figure-uploads';

const tool =
    'inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border border-transparent px-1.5 text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2c4a8a] aria-pressed:border-slate-300 aria-pressed:bg-slate-100 aria-pressed:font-semibold [&_svg]:size-3.5';

/**
 * A figure in the editor: the image at its width, its tools (width, replace,
 * description, delete) while the figure is active, and the caption below,
 * numbered by manuscript.css.
 */
export function FigureView({
    node,
    updateAttributes,
    deleteNode,
    selected,
    editor,
    getPos,
    extension,
}: ReactNodeViewProps) {
    const { t } = useT();
    const id = useId();
    const fileInput = useRef<HTMLInputElement>(null);
    const options = extension.options as FigureOptions;
    const image = String(node.attrs.image ?? '');
    const alt = String(node.attrs.alt ?? '');
    const width = Number(node.attrs.width ?? 100) as FigureWidth;
    const token = (node.attrs.upload as string | null) ?? null;
    const upload = useUpload(token);
    const uploading = upload?.status === 'uploading';

    const choose = () => fileInput.current?.click();

    const replace = (file: File | undefined) => {
        const pos = getPos();

        if (file && typeof pos === 'number') {
            editor.commands.replaceFigureImage(pos, file);
        }
    };

    const dismiss = () => {
        if (token) {
            finishUpload(token);
        }

        updateAttributes({ upload: null });
    };

    return (
        <NodeViewWrapper
            as="figure"
            className={cn('ms-ed-figure', selected && 'is-active')}
            data-width={width}
        >
            <div contentEditable={false} className="ms-ed-figure-media">
                <div
                    className="ms-ed-figure-frame"
                    style={{ width: `${width}%` }}
                >
                    {image ? (
                        <img
                            src={options.imageUrl(image)}
                            alt={alt}
                            draggable={false}
                        />
                    ) : (
                        !uploading && (
                            <div className="ms-ui ms-ed-figure-empty">
                                <span>{t('No image yet.')}</span>
                                <button
                                    type="button"
                                    className={tool}
                                    onClick={choose}
                                >
                                    <ImageUp aria-hidden="true" />
                                    {t('Choose an image')}
                                </button>
                            </div>
                        )
                    )}

                    {uploading && (
                        <div
                            role="status"
                            className="ms-ui ms-ed-figure-progress"
                        >
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-5 animate-spin"
                            />
                            <span>
                                {upload.progress !== null
                                    ? t('Uploading the image… {percent} %', {
                                          percent: Math.round(
                                              upload.progress * 100,
                                          ),
                                      })
                                    : t('Uploading the image…')}
                            </span>
                        </div>
                    )}
                </div>

                {upload?.status === 'failed' && (
                    <div role="alert" className="ms-ui ms-ed-figure-error">
                        <CircleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                        />
                        <span className="flex-1">
                            {t('The image was not uploaded: {reason}', {
                                reason: upload.message,
                            })}
                        </span>
                        <button type="button" className={tool} onClick={choose}>
                            {t('Choose another file')}
                        </button>
                        <button
                            type="button"
                            className={tool}
                            onClick={dismiss}
                        >
                            {t('Dismiss')}
                        </button>
                    </div>
                )}

                <div className="ms-ui ms-ed-figure-tools">
                    <div
                        role="group"
                        aria-label={t('Figure width')}
                        className="flex items-center gap-0.5"
                    >
                        <span className="mr-1 text-xs text-slate-600">
                            {t('Width')}
                        </span>
                        {FIGURE_WIDTHS.map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={tool}
                                aria-pressed={width === value}
                                aria-label={t('{percent} % of the text width', {
                                    percent: value,
                                })}
                                onClick={() =>
                                    updateAttributes({ width: value })
                                }
                            >
                                {value} %
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={tool}
                        disabled={uploading}
                        onClick={choose}
                        data-figure-replace=""
                    >
                        <ImageUp aria-hidden="true" />
                        {image ? t('Replace image') : t('Choose an image')}
                    </button>
                    <button
                        type="button"
                        className={cn(tool, 'text-red-700')}
                        onClick={deleteNode}
                        aria-label={t('Delete figure')}
                        title={t('Delete figure')}
                    >
                        <Trash2 aria-hidden="true" />
                    </button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept={FIGURE_TYPES.join(',')}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                        data-figure-file=""
                        onChange={(event) => {
                            replace(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                </div>

                <div className="ms-ui ms-ed-figure-alt">
                    <label
                        htmlFor={`${id}-alt`}
                        className="text-xs font-medium text-slate-700"
                    >
                        {t('Describe image')}
                    </label>
                    <input
                        id={`${id}-alt`}
                        data-figure-alt=""
                        value={alt}
                        maxLength={300}
                        placeholder={t(
                            'Short description for readers who cannot see the image',
                        )}
                        onChange={(event) =>
                            updateAttributes({ alt: event.target.value })
                        }
                        onKeyDown={(event) => {
                            // Enter and Escape return to the caption.
                            if (
                                event.key === 'Enter' ||
                                event.key === 'Escape'
                            ) {
                                event.preventDefault();
                                const pos = getPos();

                                if (typeof pos === 'number') {
                                    editor
                                        .chain()
                                        .focus()
                                        .setTextSelection(
                                            pos + node.nodeSize - 2,
                                        )
                                        .run();
                                }
                            }
                        }}
                        className="h-7 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:border-[#2c4a8a] focus-visible:ring-2 focus-visible:ring-[#2c4a8a]/30 focus-visible:outline-none"
                    />
                </div>
            </div>

            <NodeViewContent className="ms-ed-figure-content" />
        </NodeViewWrapper>
    );
}
