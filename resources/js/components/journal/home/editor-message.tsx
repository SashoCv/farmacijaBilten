import { Link, usePage } from '@inertiajs/react';
import { useT } from '@/lib/i18n';

/**
 * The page's one navy band: the editor's mission sentence, quoted word for
 * word from the Editor's words page (the server extracts it), signed.
 */
export function EditorMessage({ quote }: { quote: string }) {
    const { t } = useT();
    const { editor } = usePage().props.journal;
    const name = editor.title
        ? `${t(editor.title)} ${editor.name}`
        : editor.name;

    return (
        <section aria-labelledby="editor-title" className="navy-band">
            <div className="page-wrap py-10 md:py-12">
                <figure className="m-0 grid gap-x-6 gap-y-4 lg:grid-cols-12">
                    <h2
                        id="editor-title"
                        className="m-0 pt-2 font-sans text-eyebrow font-semibold tracking-[0.08em] text-sky! uppercase lg:col-span-2"
                    >
                        {t('From the editor')}
                    </h2>
                    <div className="flex min-w-0 flex-col gap-6 lg:col-span-10">
                        <blockquote
                            lang="en"
                            cite="/editorial"
                            className="relative m-0 font-serif text-[20px] leading-[1.5] font-normal text-pretty md:text-[22px] md:leading-[1.45]"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-[-0.05em] -left-[0.6em] font-serif text-[1.7em] leading-none text-sky max-md:hidden"
                            >
                                “
                            </span>
                            <p className="m-0">{quote}</p>
                        </blockquote>
                        <figcaption className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-t border-white/15 pt-5">
                            <div className="flex items-center gap-5">
                                {editor.signature && (
                                    <img
                                        src={editor.signature}
                                        alt={t('Signature of {name}', {
                                            name,
                                        })}
                                        width={150}
                                        height={68}
                                        loading="lazy"
                                        decoding="async"
                                        // Dark ink on a transparent ground: shown white on navy.
                                        className="h-11 w-auto brightness-0 invert"
                                    />
                                )}
                                <span className="flex flex-col">
                                    <span className="text-ui font-semibold text-white">
                                        {name}
                                    </span>
                                    {editor.role && (
                                        <span className="text-meta text-footer-text">
                                            {t(editor.role)}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <p className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-ui font-semibold">
                                <Link href="/editorial">
                                    {t('Read the editor’s words')}
                                    <span aria-hidden="true"> →</span>
                                </Link>
                                <Link href="/editorial-board">
                                    {t('Editorial board')}
                                </Link>
                            </p>
                        </figcaption>
                    </div>
                </figure>
            </div>
        </section>
    );
}
