/*
 * JSON and upload requests outside Inertia (autosave, file uploads): the
 * session cookie plus Laravel's XSRF-TOKEN cookie as the CSRF header.
 */

export function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    if (!match) {
        return '';
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export type HttpResult<T> = {
    ok: boolean;
    status: number;
    body: T | null;
};

/** fetch with JSON in and out; never throws (status 0 = network failure). */
export async function sendJson<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: unknown,
): Promise<HttpResult<T>> {
    try {
        const init: RequestInit = {
            method,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrfToken(),
                ...(data === undefined
                    ? {}
                    : { 'Content-Type': 'application/json' }),
            },
        };

        if (data !== undefined) {
            init.body = JSON.stringify(data);
        }

        const response = await fetch(url, init);
        let body: T | null = null;

        try {
            body = (await response.json()) as T;
        } catch {
            body = null;
        }

        return { ok: response.ok, status: response.status, body };
    } catch {
        return { ok: false, status: 0, body: null };
    }
}

/** Multipart POST with upload progress; never throws (status 0 = network failure). */
export function uploadForm<T = unknown>(
    url: string,
    form: FormData,
    onProgress?: (fraction: number) => void,
): Promise<HttpResult<T>> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.withCredentials = true;
        xhr.responseType = 'json';
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken());
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress?.(event.loaded / event.total);
            }
        };
        xhr.onerror = () => resolve({ ok: false, status: 0, body: null });
        xhr.onload = () =>
            resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                body: (xhr.response ?? null) as T | null,
            });
        xhr.send(form);
    });
}

/** A short, translated reason for a failed request (pass t). */
export function failureReason(
    result: HttpResult<unknown>,
    t: (text: string) => string,
): string {
    const body = result.body as {
        message?: string;
        errors?: Record<string, string[]>;
    } | null;

    if (result.status === 0) {
        return t('The connection failed. Check it and try again.');
    }

    if (result.status === 401 || result.status === 419) {
        return t(
            'Your session expired. Sign in again in a new tab, then try again.',
        );
    }

    if (result.status === 403) {
        return t('This can no longer be changed.');
    }

    if (result.status === 413) {
        return t('The file is too large.');
    }

    const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;

    return first ?? body?.message ?? t('Something went wrong. Try again.');
}
