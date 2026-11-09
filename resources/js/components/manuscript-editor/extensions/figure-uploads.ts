import { useSyncExternalStore } from 'react';

/*
 * Uploads in progress, by the client-only `upload` token of a figure. The
 * figure's node view shows the progress or the error next to the image.
 */

export type UploadState =
    | { status: 'uploading'; progress: number | null }
    | { status: 'failed'; message: string };

const uploads = new Map<string, UploadState>();
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function startUpload(
    token: string,
    progress: number | null = null,
): void {
    uploads.set(token, { status: 'uploading', progress });
    emit();
}

export function failUpload(token: string, message: string): void {
    uploads.set(token, { status: 'failed', message });
    emit();
}

export function finishUpload(token: string): void {
    uploads.delete(token);
    emit();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

/** The state of one upload (null: none, or the page was reloaded meanwhile). */
export function useUpload(token: string | null): UploadState | null {
    return useSyncExternalStore(
        subscribe,
        () => (token ? (uploads.get(token) ?? null) : null),
        () => null,
    );
}
