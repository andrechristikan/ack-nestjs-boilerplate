import { EnumAppEnvironment } from '@app/enums/app.enum';

const userData: {
    country: string;
    email: Lowercase<string>;
    username: Lowercase<string>;
    name: string;
    role: string;
    password: string;
}[] = [
    {
        country: 'ID',
        email: 'superadmin@mail.com',
        username: 'superadmin',
        name: 'Super Admin',
        role: 'superadmin',
        password: 'aaAA@123',
    },
    {
        country: 'ID',
        email: 'admin@mail.com',
        username: 'admin',
        name: 'Admin',
        role: 'admin',
        password: 'aaAA@123',
    },
];

export const migrationUserData: Record<
    EnumAppEnvironment,
    {
        country: string;
        email: string;
        username: string;
        name: string;
        role: string;
        password: string;
    }[]
> = {
    [EnumAppEnvironment.local]: [
        ...userData,
        {
            country: 'ID',
            email: 'user@mail.com',
            username: 'user',
            name: 'User',
            role: 'user',
            password: 'aaAA@123',
        },
    ],
    [EnumAppEnvironment.development]: userData,
    [EnumAppEnvironment.staging]: userData,
    [EnumAppEnvironment.production]: userData,
};
