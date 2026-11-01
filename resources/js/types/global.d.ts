import type { Auth } from '@/types/auth';
import type { JournalFacts } from '@/types/journal';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            locale: 'en' | 'mk';
            currentIssueSlug: string | null;
            /** Facts from config/journal.php. */
            journal: JournalFacts;
            /** Canonical URL of the current page (https, no query except ?page=N). */
            canonical: string;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
