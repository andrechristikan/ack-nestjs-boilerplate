import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { IMigrationUserData } from '@migration/interfaces/migration.interface';

export const MigrationUserSuperAdminId = '6aac171205d6fc2f45c6d616';

const UserData: IMigrationUserData[] = [
    {
        id: MigrationUserSuperAdminId,
        country: 'ID',
        email: 'superadmin@mail.com',
        username: 'superadmin',
        name: 'Super Admin',
        role: 'superadmin',
        password: 'aaAA@123',
    },
    {
        id: null,
        country: 'ID',
        email: 'admin@mail.com',
        username: 'admin',
        name: 'Admin',
        role: 'admin',
        password: 'aaAA@123',
    },
];

export const MigrationUserData: Record<
    EnumAppEnvironment,
    IMigrationUserData[]
> = {
    [EnumAppEnvironment.local]: [
        ...UserData,
        {
            id: null,
            country: 'ID',
            email: 'user@mail.com',
            username: 'user',
            name: 'User',
            role: 'user',
            password: 'aaAA@123',
        },
    ],
    [EnumAppEnvironment.test]: [
        ...UserData,
        {
            id: null,
            country: 'ID',
            email: 'user@mail.com',
            username: 'user',
            name: 'User',
            role: 'user',
            password: 'aaAA@123',
        },
    ],
    [EnumAppEnvironment.development]: UserData,
    [EnumAppEnvironment.staging]: UserData,
    [EnumAppEnvironment.production]: UserData,
};
