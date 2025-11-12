import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';

const userData: {
    country: string;
    email: Lowercase<string>;
    name: string;
    role: string;
    password: string;
}[] = [
    {
        country: 'ID',
        email: 'superadmin@mail.com',
        name: 'Super Admin',
        role: 'superadmin',
        password: 'aaAA@123',
    },
    {
        country: 'ID',
        email: 'admin@mail.com',
        name: 'Admin',
        role: 'admin',
        password: 'aaAA@123',
    },
    {
        country: 'ID',
        email: 'user@mail.com',
        name: 'User',
        role: 'user',
        password: 'aaAA@123',
    },
];

export const migrationUserData: Record<
    ENUM_APP_ENVIRONMENT,
    {
        country: string;
        email: string;
        name: string;
        role: string;
        password: string;
    }[]
> = {
    [ENUM_APP_ENVIRONMENT.LOCAL]: userData,
    [ENUM_APP_ENVIRONMENT.DEVELOPMENT]: userData,
    [ENUM_APP_ENVIRONMENT.STAGING]: userData,
    [ENUM_APP_ENVIRONMENT.PRODUCTION]: userData,
};
