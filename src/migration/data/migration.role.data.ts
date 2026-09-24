import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';

const RoleData: Prisma.RoleCreateInput[] = [
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
    Prisma.RoleCreateInput[]
> = {
    [EnumAppEnvironment.local]: RoleData,
    [EnumAppEnvironment.test]: RoleData,
    [EnumAppEnvironment.development]: RoleData,
    [EnumAppEnvironment.staging]: RoleData,
    [EnumAppEnvironment.production]: RoleData,
};
