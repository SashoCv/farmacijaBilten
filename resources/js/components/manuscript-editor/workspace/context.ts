import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { createContext, useContext } from 'react';
import type { CheckIssue } from '@/types/manuscript';
import type { FigureOptions } from '../extensions/figure-shared';
import type { Store } from './store';

/** The editor the shared toolbar acts on, and what it is called. */
export type ActiveEditor = { editor: Editor; label: string; field: string };

/**
 * Stable services shared by the fields of the editor page. Created once:
 * nothing in here changes identity, so the fields never re-render because
 * of it.
 */
export type Workspace = {
    /** A rich-text field changed (its JSON is read from the editor on save). */
    changed: () => void;
    register: (field: string, editor: Editor) => void;
    unregister: (field: string, editor: Editor) => void;
    /** True when the field has no text (or is not mounted). */
    isEmpty: (field: string) => boolean;
    /** Initial value of a rich-text field. */
    initial: (field: string) => JSONContent | null;
    active: Store<ActiveEditor | null>;
    issues: Store<CheckIssue[]>;
    /** Figure uploads and image URLs (section bodies). */
    figures: FigureOptions;
    /** Leaving a field: save soon. */
    blurred: () => void;
};

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
    const workspace = useContext(WorkspaceContext);

    if (!workspace) {
        throw new Error('useWorkspace() outside the manuscript workspace');
    }

    return workspace;
}

/** Id of the element listing the check issues of a field (for aria-describedby). */
export function issueId(field: string): string {
    return `ms-issues-${field.replace(/[^\w-]/g, '-')}`;
}
