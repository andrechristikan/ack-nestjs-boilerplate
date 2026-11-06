import { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IWorkspaceActiveFilter } from '@modules/workspace/interfaces/workspace.interface';

/** @public */
export const WorkspaceStoreKey = 'WorkspaceStoreKey';

/** @public */
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStoreKey';

/** @public */
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/** @public */
export const WorkspaceActiveFilter: IWorkspaceActiveFilter = [
    { deletedAt: null },
    { deletedAt: { isSet: false } },
];

/** @public */
export const WorkspaceInviteNoncePattern = '{workspaceId}:{email}';

/** @public */
export const WorkspaceJoinRequestNoncePattern = '{workspaceId}:{userId}';

/** @public */
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

/** @public */
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

/** @public */
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

/** @public */
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
