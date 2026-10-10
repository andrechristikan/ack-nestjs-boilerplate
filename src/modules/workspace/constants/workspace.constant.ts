import { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { RoleSelect } from '@modules/role/constants/role.constant';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Request-store key holding the workspace the workspace guard resolved.
 * @public
 */
export const WorkspaceStoreKey = 'WorkspaceStore';

/**
 * Request-store key holding the caller's workspace membership.
 * @public
 */
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStore';

/**
 * Workspace guard error kits for `@WorkspaceProtected` and the workspace policy decorators.
 * @public
 */
export const DocWorkspaceErrorResponses = {
    notFound: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumWorkspaceStatusCodeError.notFound,
        messagePath: 'workspace.error.notFound',
    }),
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
        messagePath: 'workspace.error.memberForbidden',
    }),
    memberNotFound: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
        messagePath: 'workspace.error.memberNotFound',
    }),
} as const;

/**
 * Matches a `Workspace` that is not soft-deleted; spread it or list it under `AND` in an active-only read.
 * @public
 */
export const WorkspaceActiveFilter = {
    deletedAt: null,
} as const satisfies Prisma.WorkspaceWhereInput;

/**
 * Relations the member-with-role read (`IWorkspaceMemberWithRole`) loads: the member's workspace
 * role identity.
 * @public
 */
export const WorkspaceMemberRoleInclude = {
    role: { select: RoleSelect },
} as const satisfies Prisma.WorkspaceMemberInclude;

/**
 * Relations an invite read loads so a response and a notification carry the role names: the
 * workspace role and, when the invite also grants a project, the project role.
 * @public
 */
export const WorkspaceInviteRoleInclude = {
    workspaceRole: { select: RoleSelect },
    projectRole: { select: RoleSelect },
} as const satisfies Prisma.WorkspaceInviteInclude;

/**
 * Columns a user-scope workspace invite list read returns; the invite token is never among them.
 * @public
 */
export const WorkspaceInviteUserListSelect = {
    id: true,
    workspaceId: true,
    email: true,
    workspaceRole: { select: RoleSelect },
    projectId: true,
    projectRole: { select: RoleSelect },
    reference: true,
    expiredAt: true,
    status: true,
    invitedByUserId: true,
    acceptedAt: true,
    acceptedByUserId: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
} satisfies Prisma.WorkspaceInviteSelect;
