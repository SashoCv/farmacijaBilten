import { Form, Head, Link, router } from '@inertiajs/react';
import { Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import UserAdminController from '@/actions/App/Http/Controllers/Admin/UserAdminController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index } from '@/routes/admin/users';
import type { Role } from '@/types';

type Person = {
    id: number;
    name: string;
    title: string | null;
    email: string;
    affiliation: string | null;
    country: string | null;
    orcid: string | null;
    roles: Role[];
    active: boolean;
    verified: boolean;
    secondFactor: boolean;
    createdAt: string | null;
};

type Props = {
    users: Person[];
    pagination: { currentPage: number; lastPage: number; total: number };
    filters: { q: string; role: Role | null; status: string | null };
    roles: Role[];
    currentUserId: number | null;
};

const ROLE_LABELS: Record<Role, string> = {
    admin: 'Editorial office',
    author: 'Author',
    reviewer: 'Reviewer',
};

function useDate() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

/** Roles and access for one person, in a dialog. */
function EditPerson({
    person,
    roles,
    isSelf,
    onClose,
}: {
    person: Person;
    roles: Role[];
    isSelf: boolean;
    onClose: () => void;
}) {
    const { t } = useT();

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle>{person.name}</DialogTitle>
                <DialogDescription>{person.email}</DialogDescription>

                <Form
                    {...UserAdminController.updateRoles.form(person.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <fieldset className="grid gap-3">
                                <legend className="mb-2 text-sm font-medium">
                                    {t('Roles')}
                                </legend>
                                {/* An empty list must still reach the server. */}
                                <input type="hidden" name="roles" value="" />
                                {roles.map((role) => (
                                    <div
                                        key={role}
                                        className="flex items-center gap-3"
                                    >
                                        <Checkbox
                                            id={`role-${role}`}
                                            name="roles[]"
                                            value={role}
                                            defaultChecked={person.roles.includes(
                                                role,
                                            )}
                                            disabled={
                                                isSelf && role === 'admin'
                                            }
                                        />
                                        <Label htmlFor={`role-${role}`}>
                                            {t(ROLE_LABELS[role])}
                                        </Label>
                                        {isSelf && role === 'admin' && (
                                            <>
                                                <input
                                                    type="hidden"
                                                    name="roles[]"
                                                    value="admin"
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    {t('your own role')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                                <InputError message={errors.roles} />
                            </fieldset>

                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onClose}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {t('Save roles')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>

                {!isSelf && (
                    <Form
                        {...UserAdminController.updateStatus.form(person.id)}
                        options={{ preserveScroll: true }}
                        onSuccess={onClose}
                        className="border-t pt-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="active"
                                    value={person.active ? '0' : '1'}
                                />
                                <p className="m-0 mb-3 text-sm text-muted-foreground">
                                    {person.active
                                        ? t(
                                              'A deactivated account cannot sign in. Its manuscripts, reviews and history are kept.',
                                          )
                                        : t(
                                              'This account is deactivated and cannot sign in.',
                                          )}
                                </p>
                                <Button
                                    type="submit"
                                    variant={
                                        person.active
                                            ? 'destructive'
                                            : 'secondary'
                                    }
                                    disabled={processing}
                                >
                                    {person.active
                                        ? t('Deactivate account')
                                        : t('Reactivate account')}
                                </Button>
                                <InputError message={errors.active} />
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function UsersIndex({
    users,
    pagination,
    filters,
    roles,
    currentUserId,
}: Props) {
    const { t } = useT();
    const date = useDate();
    const [editing, setEditing] = useState<Person | null>(null);

    const visit = (query: Record<string, string | number | null>) =>
        router.get(
            index().url,
            Object.fromEntries(
                Object.entries({ ...filters, ...query }).filter(
                    ([, value]) => value !== null && value !== '',
                ),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );

    return (
        <>
            <Head title={t('People and roles')} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('People and roles')}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-muted-foreground">
                        {t(
                            'Authors sign up themselves and reviewers join by invitation. Here you add or remove roles and deactivate accounts.',
                        )}
                    </p>
                </header>

                <form
                    role="search"
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        const q = data.get('q');
                        visit({
                            q: typeof q === 'string' ? q : '',
                            page: null,
                        });
                    }}
                >
                    <div className="grid min-w-[16rem] flex-1 gap-1.5">
                        <Label htmlFor="q">{t('Search')}</Label>
                        <div className="relative">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="q"
                                name="q"
                                type="search"
                                defaultValue={filters.q}
                                placeholder={t(
                                    'Name, e-mail, institution or ORCID',
                                )}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="role">{t('Role')}</Label>
                        <select
                            id="role"
                            value={filters.role ?? ''}
                            onChange={(event) =>
                                visit({ role: event.target.value, page: null })
                            }
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            <option value="">{t('All roles')}</option>
                            {roles.map((role) => (
                                <option key={role} value={role}>
                                    {t(ROLE_LABELS[role])}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="status">{t('Status')}</Label>
                        <select
                            id="status"
                            value={filters.status ?? ''}
                            onChange={(event) =>
                                visit({
                                    status: event.target.value,
                                    page: null,
                                })
                            }
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            <option value="">{t('All')}</option>
                            <option value="active">{t('Active')}</option>
                            <option value="deactivated">
                                {t('Deactivated')}
                            </option>
                        </select>
                    </div>
                    <Button type="submit" variant="secondary">
                        {t('Search')}
                    </Button>
                </form>

                <p className="m-0 text-sm text-muted-foreground" role="status">
                    {t('{count} people', { count: pagination.total })}
                </p>

                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Person')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Institution')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Roles')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Since')}
                                </th>
                                <th scope="col" className="px-4 py-2.5">
                                    <span className="sr-only">
                                        {t('Actions')}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        {t('No one matches these filters.')}
                                    </td>
                                </tr>
                            )}
                            {users.map((person) => (
                                <tr
                                    key={person.id}
                                    className="border-b last:border-b-0"
                                >
                                    <td className="px-4 py-3 align-top">
                                        <div className="font-medium">
                                            {person.title && (
                                                <span className="text-muted-foreground">
                                                    {person.title}{' '}
                                                </span>
                                            )}
                                            {person.name}
                                            {person.secondFactor && (
                                                <ShieldCheck
                                                    aria-label={t(
                                                        'Two-factor authentication on',
                                                    )}
                                                    className="ml-1.5 inline size-4 text-emerald-600"
                                                />
                                            )}
                                        </div>
                                        <div className="text-muted-foreground">
                                            {person.email}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            {!person.verified && (
                                                <Badge variant="outline">
                                                    {t('E-mail not confirmed')}
                                                </Badge>
                                            )}
                                            {!person.active && (
                                                <Badge variant="destructive">
                                                    {t('Deactivated')}
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-muted-foreground">
                                        {person.affiliation ?? '—'}
                                        {person.orcid && (
                                            <div className="mt-1">
                                                <a
                                                    href={`https://orcid.org/${person.orcid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline-offset-4 hover:underline"
                                                >
                                                    ORCID {person.orcid}
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-wrap gap-1.5">
                                            {person.roles.length === 0 && (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                            {person.roles.map((role) => (
                                                <Badge
                                                    key={role}
                                                    variant={
                                                        role === 'admin'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {t(ROLE_LABELS[role])}
                                                </Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                                        {date(person.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right align-top">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditing(person)}
                                        >
                                            {t('Edit')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination.lastPage > 1 && (
                    <nav
                        aria-label={t('Pages')}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="text-muted-foreground">
                            {t('Page {page} of {pages}', {
                                page: pagination.currentPage,
                                pages: pagination.lastPage,
                            })}
                        </span>
                        <div className="flex gap-2">
                            {pagination.currentPage > 1 && (
                                <Link
                                    href={index({
                                        query: {
                                            ...filters,
                                            page: pagination.currentPage - 1,
                                        },
                                    })}
                                    preserveScroll
                                    className="rounded-md border px-3 py-1.5 hover:bg-muted"
                                >
                                    {t('Previous')}
                                </Link>
                            )}
                            {pagination.currentPage < pagination.lastPage && (
                                <Link
                                    href={index({
                                        query: {
                                            ...filters,
                                            page: pagination.currentPage + 1,
                                        },
                                    })}
                                    preserveScroll
                                    className="rounded-md border px-3 py-1.5 hover:bg-muted"
                                >
                                    {t('Next')}
                                </Link>
                            )}
                        </div>
                    </nav>
                )}
            </div>

            {editing && (
                <EditPerson
                    key={editing.id}
                    person={editing}
                    roles={roles}
                    isSelf={editing.id === currentUserId}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'People and roles', href: index() },
    ],
};
