import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/** @public */
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/** @public */
export const ProjectContextStoreKey = 'ProjectContextStoreKey';

/** @public */
export const ProjectBypassRoles: EnumWorkspaceMemberRole[] = [
    EnumWorkspaceMemberRole.owner,
    EnumWorkspaceMemberRole.admin,
];

/** @public */
export const ProjectProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumProjectStatusCodeError.notFound,
        messagePath: 'project.error.notFound',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.guardMissing,
        messagePath: 'workspace.error.guardMissing',
    },
];

/** @public */
export const ProjectMemberProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumProjectStatusCodeError.memberForbidden,
        messagePath: 'project.error.memberForbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumProjectStatusCodeError.guardMissing,
        messagePath: 'project.error.guardMissing',
    },
];

/** @public */
export const ProjectRoleProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumProjectStatusCodeError.memberForbidden,
        messagePath: 'project.error.memberForbidden',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumProjectStatusCodeError.roleForbidden,
        messagePath: 'project.error.roleForbidden',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumProjectStatusCodeError.guardMissing,
        messagePath: 'project.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
        messagePath: 'workspace.error.memberGuardMissing',
    },
];

/**
 * Matches a `Project` that is not soft-deleted; spread it or list it under `AND` in an active-only read.
 * @public
 */
export const ProjectActiveFilter = {
    deletedAt: null,
} as const satisfies Prisma.ProjectWhereInput;

/**
 * The only workspace role that sees and manages every project without a `ProjectMember` row.
 * @public
 */
export const ProjectWorkspaceBypassRole = EnumWorkspaceMemberRole.owner;
