import { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
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
 * Route metadata key holding the workspace roles `@WorkspaceMemberProtected` requires.
 * @public
 */
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/**
 * Workspace guard error kit for `@WorkspaceProtected`.
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
} as const;

/**
 * Workspace role guard error kit for role-gated `@WorkspaceMemberProtected`.
 * @public
 */
export const DocWorkspaceRoleErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
        messagePath: 'workspace.error.roleForbidden',
    }),
} as const;

/**
 * Matches a `Workspace` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 * @public
 */
export const WorkspaceActiveFilter: NonNullable<
    Prisma.WorkspaceWhereInput['OR']
> = [{ deletedAt: null }, { deletedAt: { isSet: false } }];

/**
 * Columns a user-scope workspace invite list read returns; the invite token is never among them.
 * @public
 */
export const WorkspaceInviteUserListSelect = {
    id: true,
    workspaceId: true,
    email: true,
    workspaceRole: true,
    projectId: true,
    projectRole: true,
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
