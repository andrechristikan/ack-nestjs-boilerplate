import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleType } from '@generated/prisma-client/client';
import type {
    IMigrationEnvironmentData,
    IMigrationRoleData,
} from '@migration/interfaces/migration.interface';

const RoleData: IMigrationRoleData[] = [
    {
        name: 'superadmin',
        description: 'super admin role',
        type: EnumRoleType.superAdmin,
        isImmutable: true,
    },
    {
        name: 'admin',
        description: 'admin role',
        type: EnumRoleType.admin,
        isImmutable: true,
    },
    {
        name: 'user',
        description: 'user role',
        type: EnumRoleType.user,
        isImmutable: true,
    },
];

export const MigrationRoleData: IMigrationEnvironmentData<
    IMigrationRoleData[]
> = {
    [EnumAppEnvironment.local]: RoleData,
    [EnumAppEnvironment.development]: RoleData,
    [EnumAppEnvironment.staging]: RoleData,
    [EnumAppEnvironment.production]: RoleData,
};
