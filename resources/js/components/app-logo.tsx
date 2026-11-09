import { usePage } from '@inertiajs/react';
import { LogoMark } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';

/** The journal's mark and name, above the back-office navigation. */
export default function AppLogo() {
    const { t, locale } = useT();
    const { journal } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center">
                <LogoMark className="size-8 text-[#1F3770] dark:text-white" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {locale === 'mk' ? journal.nameMk : journal.nameEn}
                </span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                    {t('Manuscript system')}
                </span>
            </div>
        </>
    );
}
