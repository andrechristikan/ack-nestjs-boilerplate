import { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

/**
 * Prisma select for the role identity every assignment and log reads: id, scope, key and name.
 * @public
 */
export const RoleSelect = {
    id: true,
    scope: true,
    key: true,
    name: true,
} as const;

/**
 * Prisma include loading a role's policies.
 * @public
 */
export const RolePoliciesInclude = {
    policies: true,
} as const satisfies Prisma.RoleInclude;

/**
 * Prisma select counting every row that references a role: users, workspace members, project
 * members and invites through either role slot.
 * @public
 */
export const RoleUsageCountSelect = {
    _count: {
        select: {
            users: true,
            workspaceMembers: true,
            projectMembers: true,
            workspaceInvitesAsWorkspaceRole: true,
            workspaceInvitesAsProjectRole: true,
        },
    },
} as const satisfies Prisma.RoleSelect;

/**
 * Catalog role keys per scope; a role whose key is listed for its scope is predefined.
 * @public
 */
export const RolePredefinedKeys: Record<EnumRoleScope, readonly string[]> = {
    [EnumRoleScope.platform]: Object.values(EnumRolePlatformKey),
    [EnumRoleScope.workspace]: Object.values(EnumRoleWorkspaceKey),
    [EnumRoleScope.project]: Object.values(EnumRoleProjectKey),
};
