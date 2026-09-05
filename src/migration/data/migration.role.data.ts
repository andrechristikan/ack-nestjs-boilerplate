import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleType, Prisma } from '@generated/prisma-client';

const roleData: Prisma.RoleCreateInput[] = [
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

export const migrationRoleData: Record<
    EnumAppEnvironment,
    Prisma.RoleCreateInput[]
> = {
    [EnumAppEnvironment.local]: roleData,
    [EnumAppEnvironment.development]: roleData,
    [EnumAppEnvironment.staging]: roleData,
    [EnumAppEnvironment.production]: roleData,
};
