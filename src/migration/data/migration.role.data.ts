import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { IMigrationRoleData } from '@migration/interfaces/migration.interface';

const RoleData: IMigrationRoleData[] = [
    {
        name: 'superadmin',
        description: 'Super Admin Role',
        type: EnumRoleType.superAdmin,
    },
    {
        name: 'admin',
        description: 'Admin Role',
        type: EnumRoleType.admin,
    },
    {
        name: 'user',
        description: 'User Role',
        type: EnumRoleType.user,
    },
];

export const MigrationRoleData: Record<
    EnumAppEnvironment,
    IMigrationRoleData[]
> = {
    [EnumAppEnvironment.local]: RoleData,
    [EnumAppEnvironment.development]: RoleData,
    [EnumAppEnvironment.staging]: RoleData,
    [EnumAppEnvironment.production]: RoleData,
};
