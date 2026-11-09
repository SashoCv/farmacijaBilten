import type {
    CheckIssue,
    ManuscriptContent,
    SaveResponse,
    SubmissionData,
} from '@/types/manuscript';
import { createStore } from './store';

/*
 * Autosave for the manuscript editor (docs/backoffice/plan.md §6.3).
 *
 *  - every change marks the draft dirty and saves ~1.5 s after the last one;
 *    leaving a field, hiding the tab or leaving the page saves at once;
 *  - every change is also copied to localStorage, so nothing is lost when
 *    the network, the session or the server fails;
 *  - 409: someone saved meanwhile (another window): autosave stops and the
 *    page asks for a reload; 401/419: the session expired: the copy stays in
 *    this browser and saving is retried until the author signs in again;
 *    other failures are retried with a growing delay.
 */

export type SavePayload = {
    content: ManuscriptContent;
    submission: SubmissionData;
    type: string;
    language: string;
    lock: number;
};

export type SaveStatus =
    | { kind: 'idle' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved'; at: string | null }
    | { kind: 'offline'; retryIn: number }
    | { kind: 'session' }
    | { kind: 'rejected'; message: string | null }
    | { kind: 'conflict' };

export type Backup = {
    at: string;
    synced: boolean;
    content: ManuscriptContent;
    submission: SubmissionData;
};

const DEBOUNCE_MS = 1500;
const BACKUP_MS = 400;
const SESSION_RETRY_MS = 15_000;
const RETRY_STEPS_MS = [3000, 6000, 15_000, 30_000, 60_000];
/** fetch keepalive refuses bodies above 64 KB. */
const KEEPALIVE_MAX = 60_000;

export function backupKey(id: string): string {
    return `mpb:manuscript:${id}`;
}

export function readBackup(id: string): Backup | null {
    try {
        const raw = window.localStorage.getItem(backupKey(id));

        return raw ? (JSON.parse(raw) as Backup) : null;
    } catch {
        return null;
    }
}

export function clearBackup(id: string): void {
    try {
        window.localStorage.removeItem(backupKey(id));
    } catch {
        // Storage unavailable: nothing to clear.
    }
}

function writeBackup(id: string, backup: Backup): boolean {
    try {
        window.localStorage.setItem(backupKey(id), JSON.stringify(backup));

        return true;
    } catch {
        return false;
    }
}

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

type Options = {
    id: string;
    url: string;
    lock: number;
    savedAt: string | null;
    /** Builds the content and submission from the editors and the page state. */
    collect: () => Omit<SavePayload, 'lock'>;
    onIssues: (issues: CheckIssue[]) => void;
};

export class Autosaver {
    readonly status = createStore<SaveStatus>({ kind: 'idle' });
    /** False when this browser cannot keep a copy (private mode, quota). */
    readonly backupWorks = createStore(true);

    private lock: number;
    private version = 0;
    private savedVersion = 0;
    private inflight: Promise<boolean> | null = null;
    private again = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private backupTimer: ReturnType<typeof setTimeout> | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private failures = 0;
    private stopped = false;

    constructor(private readonly options: Options) {
        this.lock = options.lock;
        this.status.set({ kind: 'saved', at: options.savedAt });
    }

    get dirty(): boolean {
        return this.version !== this.savedVersion;
    }

    get isStopped(): boolean {
        return this.stopped;
    }

    /** Something changed: back it up soon and save after a pause. */
    touch(): void {
        if (this.stopped) {
            this.scheduleBackup();

            return;
        }

        this.version++;
        this.scheduleBackup();

        const kind = this.status.get().kind;

        if (kind !== 'saving' && kind !== 'session' && kind !== 'offline') {
            this.status.set({ kind: 'dirty' });
        }

        this.schedule(DEBOUNCE_MS);
    }

    /** Saves now when there is anything to save (blur, tab hidden, submit). */
    flush(): Promise<boolean> {
        this.flushBackup();

        if (this.stopped) {
            return Promise.resolve(false);
        }

        if (!this.dirty && !this.inflight) {
            return Promise.resolve(true);
        }

        return this.save();
    }

    /** Saves even when nothing changed (to get fresh checks), then reports success. */
    async saveNow(): Promise<boolean> {
        if (!this.dirty && !this.inflight) {
            this.version++;
        }

        return this.flush();
    }

    /** Leaving the page: a last save that outlives the page, when small enough. */
    flushOnExit(): void {
        this.flushBackup();

        if (this.stopped || !this.dirty) {
            return;
        }

        const body = JSON.stringify(this.payload());

        if (body.length > KEEPALIVE_MAX) {
            return;
        }

        try {
            void fetch(this.options.url, {
                method: 'PUT',
                keepalive: true,
                credentials: 'same-origin',
                headers: this.headers(),
                body,
            }).catch(() => undefined);
        } catch {
            // The backup in localStorage still has the text.
        }
    }

    /** Stops saving for good (conflict, draft deleted, page left). */
    stop(): void {
        this.stopped = true;
        this.clearTimers();
    }

    dispose(): void {
        this.flushBackup();
        this.clearTimers();
    }

    /** Retry at once (the author signed in again, or the network is back). */
    retry(): void {
        const kind = this.status.get().kind;

        if (!this.stopped && (kind === 'session' || kind === 'offline')) {
            this.schedule(0);
        }
    }

    private clearTimers(): void {
        for (const timer of [this.timer, this.backupTimer, this.retryTimer]) {
            if (timer) {
                clearTimeout(timer);
            }
        }

        this.timer = this.backupTimer = this.retryTimer = null;
    }

    private schedule(delay: number): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
            this.timer = null;
            void this.save();
        }, delay);
    }

    private scheduleBackup(): void {
        if (this.backupTimer) {
            clearTimeout(this.backupTimer);
        }

        this.backupTimer = setTimeout(() => this.flushBackup(), BACKUP_MS);
    }

    private pendingBackup(): boolean {
        return this.backupTimer !== null;
    }

    private flushBackup(): void {
        if (!this.pendingBackup()) {
            return;
        }

        clearTimeout(this.backupTimer!);
        this.backupTimer = null;
        const { content, submission } = this.options.collect();
        this.backupWorks.set(
            writeBackup(this.options.id, {
                at: new Date().toISOString(),
                synced: false,
                content,
                submission,
            }),
        );
    }

    private markBackupSynced(): void {
        if (this.pendingBackup()) {
            return;
        }

        const backup = readBackup(this.options.id);

        if (backup && !backup.synced) {
            writeBackup(this.options.id, { ...backup, synced: true });
        }
    }

    private payload(): SavePayload {
        return { ...this.options.collect(), lock: this.lock };
    }

    private headers(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        };
    }

    private save(): Promise<boolean> {
        if (this.stopped) {
            return Promise.resolve(false);
        }

        if (this.inflight) {
            this.again = true;

            return this.inflight;
        }

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }

        this.inflight = this.request().finally(() => {
            this.inflight = null;

            if (this.again && !this.stopped) {
                this.again = false;

                if (this.dirty) {
                    this.schedule(0);
                }
            }
        });

        return this.inflight;
    }

    private async request(): Promise<boolean> {
        const version = this.version;
        const previous = this.status.get();

        // Keep showing a session or network problem until a save succeeds.
        if (previous.kind !== 'session' && previous.kind !== 'offline') {
            this.status.set({ kind: 'saving' });
        }

        let response: Response;

        try {
            response = await fetch(this.options.url, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: this.headers(),
                body: JSON.stringify(this.payload()),
            });
        } catch {
            this.failed();

            return false;
        }

        if (response.ok) {
            let data: SaveResponse | null = null;

            try {
                data = (await response.json()) as SaveResponse;
            } catch {
                data = null;
            }

            if (data && typeof data.lock === 'number') {
                this.lock = data.lock;
            }

            this.failures = 0;
            this.savedVersion = Math.max(this.savedVersion, version);

            if (data?.issues) {
                this.options.onIssues(data.issues);
            }

            if (this.dirty) {
                this.status.set({ kind: 'dirty' });
                this.schedule(DEBOUNCE_MS);
            } else {
                this.status.set({
                    kind: 'saved',
                    at: data?.savedAt ?? new Date().toISOString(),
                });
                this.markBackupSynced();
            }

            return true;
        }

        if (response.status === 409) {
            this.stop();
            this.status.set({ kind: 'conflict' });

            return false;
        }

        if (response.status === 401 || response.status === 419) {
            this.status.set({ kind: 'session' });
            this.retryTimer = setTimeout(
                () => void this.save(),
                SESSION_RETRY_MS,
            );

            return false;
        }

        if (response.status === 422 || response.status === 413) {
            let message: string | null = null;

            try {
                const body = (await response.json()) as {
                    message?: string;
                };
                message = body.message ?? null;
            } catch {
                message = null;
            }

            // Retried on the next change: the same content would fail again.
            this.status.set({ kind: 'rejected', message });

            return false;
        }

        this.failed();

        return false;
    }

    private failed(): void {
        const delay =
            RETRY_STEPS_MS[Math.min(this.failures, RETRY_STEPS_MS.length - 1)];
        this.failures++;
        this.status.set({ kind: 'offline', retryIn: delay });
        this.retryTimer = setTimeout(() => void this.save(), delay);
    }
}
