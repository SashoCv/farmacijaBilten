import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import type { ArticleTypeConfig } from '@/types/manuscript';
import { newCustomKey, sectionField } from './content';
import type { SectionState } from './content';
import { issueId, useWorkspace } from './context';
import { FieldIssues } from './field-issues';
import { PaperButton, PaperHint } from './paper-ui';
import { RichField } from './rich-field';

type Props = {
    type: ArticleTypeConfig | undefined;
    sections: SectionState[];
    onChange: (update: (previous: SectionState[]) => SectionState[]) => void;
    lang: string;
};

/**
 * The body of the paper: the type's fixed sections in order, each with its
 * printed heading and a full editor. Review papers get their own titled
 * sections at the `free` slot.
 */
export function Sections({ type, sections, onChange, lang }: Props) {
    const { t } = useT();
    const workspace = useWorkspace();
    const [removing, setRemoving] = useState<SectionState | null>(null);

    const skeleton = new Map(
        (type?.sections ?? []).map((section) => [section.key, section]),
    );

    const setHeading = (key: string, heading: string) =>
        onChange((list) =>
            list.map((s) => (s.key === key ? { ...s, heading } : s)),
        );

    const moveSection = (key: string, by: number) =>
        onChange((list) => {
            const index = list.findIndex((s) => s.key === key);
            const target = index + by;

            if (
                index < 0 ||
                !list[target] ||
                list[target].skeleton !== list[index].skeleton
            ) {
                return list;
            }

            const next = [...list];
            [next[index], next[target]] = [next[target], next[index]];

            return next;
        });

    const addAfter = (key: string, slot: string) => {
        const created: SectionState = {
            key: newCustomKey(),
            heading: '',
            skeleton: slot,
            free: true,
        };
        onChange((list) => {
            const index = list.findIndex((s) => s.key === key);
            const next = [...list];
            next.splice(index + 1, 0, created);

            return next;
        });
        requestAnimationFrame(() =>
            document
                .querySelector<HTMLElement>(
                    `[data-heading-input="${created.key}"]`,
                )
                ?.focus(),
        );
    };

    const remove = (key: string) =>
        onChange((list) => list.filter((s) => s.key !== key));

    const askRemove = (section: SectionState) => {
        if (workspace.isEmpty(sectionField(section.key))) {
            remove(section.key);
        } else {
            setRemoving(section);
        }
    };

    return (
        <div className="ms-ed-sections">
            {sections.map((section, index) => {
                const field = sectionField(section.key);
                const config = section.skeleton
                    ? skeleton.get(section.skeleton)
                    : undefined;
                const headingId = `ms-heading-${section.key}`;
                const siblings = sections.filter(
                    (s) => s.free && s.skeleton === section.skeleton,
                );
                const position = siblings.indexOf(section);
                const lastOfSlot =
                    section.free &&
                    sections[index + 1]?.skeleton !== section.skeleton;
                const options = config
                    ? [config.heading, ...config.alternatives].filter(
                          (h): h is string => Boolean(h),
                      )
                    : [];
                const title =
                    section.heading || t('Section {n}', { n: index + 1 });

                return (
                    <section
                        key={section.key}
                        aria-labelledby={headingId}
                        data-field={field}
                        className="ms-ed-section"
                    >
                        {section.free ? (
                            <div className="ms-ed-free-heading">
                                <h2 id={headingId} className="sr-only">
                                    {title}
                                </h2>
                                <label
                                    htmlFor={`${headingId}-input`}
                                    className="sr-only"
                                >
                                    {t('Section heading')}
                                </label>
                                <input
                                    id={`${headingId}-input`}
                                    data-heading-input={section.key}
                                    lang={lang}
                                    value={section.heading}
                                    maxLength={200}
                                    placeholder={t('Section heading')}
                                    aria-describedby={issueId(field)}
                                    aria-invalid={section.heading.trim() === ''}
                                    onChange={(event) =>
                                        setHeading(
                                            section.key,
                                            event.target.value,
                                        )
                                    }
                                    className="ms-ed-h1 ms-ed-heading-input"
                                />
                                <div className="ms-ui flex shrink-0 gap-0.5">
                                    <PaperButton
                                        tone="quiet"
                                        disabled={position <= 0}
                                        onClick={() =>
                                            moveSection(section.key, -1)
                                        }
                                        aria-label={t(
                                            'Move section "{name}" up',
                                            { name: title },
                                        )}
                                        title={t('Move up')}
                                    >
                                        <ArrowUp aria-hidden="true" />
                                    </PaperButton>
                                    <PaperButton
                                        tone="quiet"
                                        disabled={
                                            position === siblings.length - 1
                                        }
                                        onClick={() =>
                                            moveSection(section.key, 1)
                                        }
                                        aria-label={t(
                                            'Move section "{name}" down',
                                            { name: title },
                                        )}
                                        title={t('Move down')}
                                    >
                                        <ArrowDown aria-hidden="true" />
                                    </PaperButton>
                                    <PaperButton
                                        tone="danger"
                                        disabled={siblings.length <= 1}
                                        onClick={() => askRemove(section)}
                                        aria-label={t(
                                            'Remove section "{name}"',
                                            { name: title },
                                        )}
                                        title={
                                            siblings.length <= 1
                                                ? t(
                                                      'A review needs at least one section of its own.',
                                                  )
                                                : t('Remove')
                                        }
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </PaperButton>
                                </div>
                            </div>
                        ) : options.length > 1 ? (
                            <div className="ms-ed-select-heading">
                                <h2 id={headingId} className="sr-only">
                                    {section.heading}
                                </h2>
                                <label
                                    htmlFor={`${headingId}-select`}
                                    className="sr-only"
                                >
                                    {t('Section heading')}
                                </label>
                                <select
                                    id={`${headingId}-select`}
                                    value={section.heading}
                                    onChange={(event) =>
                                        setHeading(
                                            section.key,
                                            event.target.value,
                                        )
                                    }
                                    className="ms-ed-h1 ms-ed-heading-select"
                                >
                                    {options.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    aria-hidden="true"
                                    className="ms-ed-select-chevron"
                                />
                                <span className="ms-ui ms-ed-aside">
                                    {t('Choose the heading')}
                                </span>
                            </div>
                        ) : (
                            <h2 id={headingId} className="ms-ed-h1">
                                {section.heading}
                            </h2>
                        )}

                        {section.skeleton === null && (
                            <div className="ms-ui mb-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-950">
                                <span className="flex-1">
                                    {t(
                                        'This section is not part of the template of this article type. Move its text to another section, then remove it.',
                                    )}
                                </span>
                                <PaperButton
                                    tone="danger"
                                    onClick={() => askRemove(section)}
                                >
                                    <Trash2 aria-hidden="true" />
                                    {t('Remove')}
                                </PaperButton>
                            </div>
                        )}

                        <RichField
                            field={field}
                            variant="body"
                            label={t('{section}: text', { section: title })}
                            placeholder={t(
                                'Write the {section} here, or paste it from Word.',
                                { section: title },
                            )}
                            lang={lang}
                        />
                        <FieldIssues field={field} />

                        {lastOfSlot && (
                            <div className="ms-ui mt-3 flex flex-wrap items-center gap-3">
                                <PaperButton
                                    onClick={() =>
                                        addAfter(section.key, section.skeleton!)
                                    }
                                >
                                    <Plus aria-hidden="true" />
                                    {t('Add a section')}
                                </PaperButton>
                                <PaperHint>
                                    {t(
                                        'A review has sections of its own between the Introduction and the Conclusion.',
                                    )}
                                </PaperHint>
                            </div>
                        )}
                    </section>
                );
            })}

            <FieldIssues field="sections" />

            <Dialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>{t('Remove this section?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'The section "{name}" and all its text will be removed.',
                            {
                                name:
                                    removing?.heading || t('Untitled section'),
                            },
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setRemoving(null)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (removing) {
                                    remove(removing.key);
                                }

                                setRemoving(null);
                            }}
                        >
                            {t('Remove section')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
