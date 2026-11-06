import { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IWorkspaceActiveFilter } from '@modules/workspace/interfaces/workspace.interface';

/**
 * Request-store key holding the workspace the workspace guard resolved.
 * @public
 */
export const WorkspaceStoreKey = 'WorkspaceStoreKey';

/**
 * Request-store key holding the caller's workspace membership.
 * @public
 */
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStoreKey';

/**
 * Route metadata key holding the workspace roles `@WorkspaceMemberProtected` requires.
 * @public
 */
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/**
 * Matches a `Workspace` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 * @public
 */
export const WorkspaceActiveFilter: IWorkspaceActiveFilter = [
    { deletedAt: null },
    { deletedAt: { isSet: false } },
];

/**
 * Pattern hashed into `WorkspaceInvite.nonce` while the invite is pending.
 * @public
 */
export const WorkspaceInviteNoncePattern = '{workspaceId}:{email}';

/**
 * Pattern hashed into `WorkspaceJoinRequest.nonce` while the join request is pending.
 * @public
 */
export const WorkspaceJoinRequestNoncePattern = '{workspaceId}:{userId}';

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

/**
 * Error entries `@WorkspaceProtected` documents: the missing `x-workspace-id` header and the missing workspace.
 * @public
 */
export const WorkspaceProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumWorkspaceStatusCodeError.headerMissing,
        messagePath: 'workspace.error.headerMissing',
    },
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumWorkspaceStatusCodeError.notFound,
        messagePath: 'workspace.error.notFound',
    },
];

/**
 * Error entries the role-less `@WorkspaceMemberProtected()` documents for `WorkspaceMemberGuard`: the missing user and workspace stores and the non-member caller.
 * @public
 */
export const WorkspaceMemberProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.guardMissing,
        messagePath: 'workspace.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
        messagePath: 'workspace.error.memberForbidden',
    },
];

/**
 * Error entries `@WorkspaceMemberProtected(...roles)` documents for `WorkspaceMemberGuard` and `WorkspaceRoleGuard`: the missing user, workspace, and member stores, the non-member caller, and the forbidden role.
 * @public
 */
export const WorkspaceRoleProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.guardMissing,
        messagePath: 'workspace.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
        messagePath: 'workspace.error.memberGuardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
        messagePath: 'workspace.error.memberForbidden',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
        messagePath: 'workspace.error.roleForbidden',
    },
];
