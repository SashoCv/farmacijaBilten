/** Back-office roles (App\Enums\Role). */
export type Role = 'admin' | 'author' | 'reviewer';

/** The signed-in user, from App\Models\User::presentForAuth(). */
export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    roles: Role[];
    locale: 'en' | 'mk';
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
