import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { IMigrationRoleData } from '@migration/interfaces/migration.interface';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';

const RoleData: IMigrationRoleData[] = [
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
        description: 'Platform super admin role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
        description: 'Platform admin role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        name: 'User',
        description: 'Platform user role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.owner,
        name: 'Owner',
        description: 'Workspace owner role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        name: 'Admin',
        description: 'Workspace admin role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        name: 'Member',
        description: 'Workspace member role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        name: 'Admin',
        description: 'Project admin role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.member,
        name: 'Member',
        description: 'Project member role',
        isImmutable: true,
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        name: 'Viewer',
        description: 'Project viewer role',
        isImmutable: true,
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
