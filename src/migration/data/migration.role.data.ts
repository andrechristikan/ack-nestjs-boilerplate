import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

const RoleData: Prisma.RoleCreateInput[] = [
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
        description: 'Platform super admin role',
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
        description: 'Platform admin role',
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        name: 'User',
        description: 'Platform user role',
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.owner,
        name: 'Owner',
        description: 'Workspace owner role',
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        name: 'Admin',
        description: 'Workspace admin role',
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        name: 'Member',
        description: 'Workspace member role',
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        name: 'Admin',
        description: 'Project admin role',
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.member,
        name: 'Member',
        description: 'Project member role',
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        name: 'Viewer',
        description: 'Project viewer role',
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
