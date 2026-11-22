import { EnumAppEnvironment } from '@app/enums/app.enum';
import type {
    IMigrationEnvironmentData,
    IMigrationUserData,
} from '@migration/interfaces/migration.interface';

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
    {
        id: null,
        country: 'ID',
        email: 'user@mail.com',
        username: 'user',
        name: 'User',
        role: 'user',
        password: 'aaAA@123',
    },
];

const MigrationUserDeployedData: IMigrationUserData[] = UserData.map(user => ({
    ...user,
    password: null,
}));

export const MigrationUserData: IMigrationEnvironmentData<
    IMigrationUserData[]
> = {
    [EnumAppEnvironment.local]: UserData,
    [EnumAppEnvironment.development]: MigrationUserDeployedData,
    [EnumAppEnvironment.staging]: MigrationUserDeployedData,
    [EnumAppEnvironment.production]: MigrationUserDeployedData,
};
