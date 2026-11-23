import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { IMigrationUserData } from '@migration/interfaces/migration.interface';

export const MigrationUserSuperAdminId = 'e838f465-4713-4cec-9519-00ca2288e5f3';

const UserData: IMigrationUserData[] = [
    {
        id: MigrationUserSuperAdminId,
        country: 'ID',
        email: 'superadmin@mail.com',
        username: 'superadmin',
        name: 'Super Admin',
        role: EnumRolePlatformKey.superAdmin,
        password: 'aaAA@123',
    },
    {
        id: null,
        country: 'ID',
        email: 'admin@mail.com',
        username: 'admin',
        name: 'Admin',
        role: EnumRolePlatformKey.admin,
        password: 'aaAA@123',
    },
    {
        id: null,
        country: 'ID',
        email: 'user@mail.com',
        username: 'user',
        name: 'User',
        role: EnumRolePlatformKey.user,
        password: 'aaAA@123',
    },
];

const MigrationUserDeployedData: IMigrationUserData[] = UserData.map(user => ({
    ...user,
    password: null,
}));

export const MigrationUserData: Record<
    EnumAppEnvironment,
    IMigrationUserData[]
> = {
    [EnumAppEnvironment.local]: UserData,
    [EnumAppEnvironment.development]: MigrationUserDeployedData,
    [EnumAppEnvironment.staging]: MigrationUserDeployedData,
    [EnumAppEnvironment.production]: MigrationUserDeployedData,
};
