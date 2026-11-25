import { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import {
    UserRecipientSelect,
    UserRefSelect,
    UserStateSelect,
} from '@modules/user/constants/user.constant';

/** @public */
export const WorkspaceIdHeaderName = 'x-workspace-id';

/** @public */
export const WorkspaceSlugRegex = /^[0-9a-z-]+$/;

/** @public */
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/** @public */
export const WorkspaceIdStoreKey = 'WorkspaceIdStoreKey';

/** @public */
export const WorkspaceContextStoreKey = 'WorkspaceContextStoreKey';

/** @public */
export const WorkspaceInviteNoncePattern = '{workspaceId}:{email}';

/** @public */
export const WorkspaceJoinRequestNoncePattern = '{workspaceId}:{userId}';

/** @public */
export const WorkspaceInvitePreviewInclude = {
    workspace: true,
    invitedBy: { select: UserRefSelect },
} satisfies Prisma.WorkspaceInviteInclude;

/** @public */
export const WorkspaceRefSelect = {
    id: true,
} satisfies Prisma.WorkspaceSelect;

/** @public */
export const WorkspaceMemberRefSelect = {
    id: true,
    workspaceId: true,
    userId: true,
    role: true,
} satisfies Prisma.WorkspaceMemberSelect;

/** @public */
export const WorkspaceMemberWithUserInclude = {
    user: { select: UserRefSelect },
} satisfies Prisma.WorkspaceMemberInclude;

/** @public */
export const WorkspaceInviteRefSelect = {
    id: true,
    expiredAt: true,
} satisfies Prisma.WorkspaceInviteSelect;

/** @public */
export const WorkspaceJoinRequestRefSelect = {
    id: true,
    expiredAt: true,
} satisfies Prisma.WorkspaceJoinRequestSelect;

/** @public */
export const WorkspaceMemberWithUserStateInclude = {
    user: { select: UserStateSelect },
} satisfies Prisma.WorkspaceMemberInclude;

/** @public */
export const WorkspaceMemberWithUserRecipientInclude = {
    user: { select: UserRecipientSelect },
} satisfies Prisma.WorkspaceMemberInclude;

/** @public */
export const WorkspaceJoinRequestWithUserRecipientInclude = {
    user: { select: UserRecipientSelect },
} satisfies Prisma.WorkspaceJoinRequestInclude;

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
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
        messagePath: 'workspace.error.memberForbidden',
    },
];

/** @public */
export const WorkspaceRoleProtectedDocErrors: IDocResponseEntry[] = [
    ...WorkspaceProtectedDocErrors,
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
        messagePath: 'workspace.error.roleForbidden',
    },
];
