import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardCheck,
    FilePen,
    Files,
    Globe,
    Inbox,
    LayoutGrid,
    Mail,
    UserSearch,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useT } from '@/lib/i18n';
import { dashboard, home } from '@/routes';
import { index as archive } from '@/routes/admin/archive';
import { index as mailTemplates } from '@/routes/admin/mail-templates';
import { index as adminManuscripts } from '@/routes/admin/manuscripts';
import { index as reviewersIndex } from '@/routes/admin/reviewers';
import { index as legacySubmissions } from '@/routes/admin/submissions';
import { index as myManuscripts } from '@/routes/author/manuscripts';
import { index as users } from '@/routes/admin/users';
import { index as myReviews } from '@/routes/reviewer/reviews';
import type { NavItem } from '@/types';

/** Back-office navigation: one group per role the user holds. */
export function AppSidebar() {
    const { t } = useT();
    const roles = usePage().props.auth.user?.roles ?? [];

    const overview: NavItem[] = [
        { title: t('Dashboard'), href: dashboard(), icon: LayoutGrid },
    ];

    const writing: NavItem[] = [
        { title: t('My manuscripts'), href: myManuscripts(), icon: FilePen },
    ];

    const reviewing: NavItem[] = [
        { title: t('My reviews'), href: myReviews(), icon: ClipboardCheck },
    ];

    const office: NavItem[] = [
        { title: t('Manuscripts'), href: adminManuscripts(), icon: Files },
        { title: t('Reviewers'), href: reviewersIndex(), icon: UserSearch },
        { title: t('Archive and issues'), href: archive(), icon: BookOpen },
        { title: t('E-mail templates'), href: mailTemplates(), icon: Mail },
        { title: t('People and roles'), href: users(), icon: Users },
        {
            title: t('Old website form'),
            href: legacySubmissions(),
            icon: Inbox,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain label={t('Overview')} items={overview} />
                {roles.includes('author') && (
                    <NavMain label={t('Author')} items={writing} />
                )}
                {roles.includes('reviewer') && (
                    <NavMain label={t('Reviewer')} items={reviewing} />
                )}
                {roles.includes('admin') && (
                    <NavMain label={t('Editorial office')} items={office} />
                )}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: t('Journal website') }}
                        >
                            <Link href={home()}>
                                <Globe />
                                <span>{t('Journal website')}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
                <p className="m-0 px-2 pb-1 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
                    {t('Design & development:')}{' '}
                    <a
                        href="https://nexsollabs.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                        Nexsol Labs
                    </a>
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
