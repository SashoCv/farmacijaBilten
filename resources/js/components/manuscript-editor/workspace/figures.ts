import type { JSONContent } from '@tiptap/core';
import { image as imageRoute } from '@/routes/manuscripts';
import { store as storeImage } from '@/routes/author/manuscripts/images';
import { FIGURE_MAX_BYTES, FIGURE_TYPES } from '../extensions/figure-shared';
import type { FigureOptions, UploadedImage } from '../extensions/figure-shared';
import { xsrfToken } from './autosave';

type Translate = (
    text: string,
    vars?: Record<string, string | number>,
) => string;

/** LAB ONLY: routes/lab.php replaces the upload and image URLs. */
export type LabImages = { upload: string; image: string };

/**
 * Figure uploads for one manuscript: POST {author.manuscripts.images.store}
 * with the file as `image`; images are shown from {manuscripts.image}.
 */
export function figureOptions(
    manuscriptId: string,
    t: Translate,
    lab?: LabImages,
): FigureOptions {
    // Images uploaded in this session: their URL is known already.
    const urls = new Map<string, string>();
    const uploadUrl = lab?.upload ?? storeImage(manuscriptId).url;

    const upload = (file: File, onProgress: (fraction: number) => void) =>
        new Promise<UploadedImage>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.withCredentials = true;
            xhr.responseType = 'json';
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken());

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress(event.loaded / event.total);
                }
            };

            xhr.onerror = () =>
                reject(
                    new Error(
                        t('the connection failed. Check it and try again.'),
                    ),
                );

            xhr.onload = () => {
                const body = (xhr.response ?? {}) as {
                    id?: string;
                    url?: string;
                    width?: number;
                    height?: number;
                    message?: string;
                    errors?: { image?: string[] };
                };

                if (xhr.status >= 200 && xhr.status < 300 && body.id) {
                    const image: UploadedImage = {
                        id: body.id,
                        url: body.url ?? '',
                        width: body.width ?? 0,
                        height: body.height ?? 0,
                    };

                    if (image.url) {
                        urls.set(image.id, image.url);
                    }

                    resolve(image);

                    return;
                }

                let reason: string;

                if (xhr.status === 422) {
                    reason =
                        body.errors?.image?.[0] ??
                        body.message ??
                        t('the file is not a usable image.');
                } else if (xhr.status === 413) {
                    reason = t('the file is too large (at most 15 MB).');
                } else if (xhr.status === 401 || xhr.status === 419) {
                    reason = t(
                        'your session expired. Sign in again in a new tab, then try again.',
                    );
                } else if (xhr.status === 403) {
                    reason = t('this manuscript can no longer be changed.');
                } else {
                    reason = t('the server could not store it. Try again.');
                }

                reject(new Error(reason));
            };

            const form = new FormData();
            form.append('image', file);
            xhr.send(form);
        });

    return {
        upload,
        imageUrl: (id) =>
            urls.get(id) ??
            (lab
                ? lab.image.replace('__ID__', encodeURIComponent(id))
                : imageRoute([manuscriptId, id]).url),
        rejectFile: (file) => {
            if (!FIGURE_TYPES.includes(file.type)) {
                return t('use a PNG, JPEG, WebP or GIF image.');
            }

            if (file.size > FIGURE_MAX_BYTES) {
                return t('the file is too large (at most 15 MB).');
            }

            return null;
        },
    };
}

/** Removes client-only figure attributes (an upload in progress) before saving. */
export function withoutUploads(doc: JSONContent): JSONContent {
    if (!doc.content && !(doc.type === 'figure')) {
        return doc;
    }

    const copy: JSONContent = { ...doc };

    if (doc.type === 'figure' && doc.attrs) {
        const attrs = { ...doc.attrs };
        delete attrs.upload;
        copy.attrs = attrs;
    }

    if (doc.content) {
        copy.content = doc.content.map(withoutUploads);
    }

    return copy;
}
