import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import type { IProjectActiveFilter } from '@modules/project/interfaces/project.interface';

/** @public */
export const ProjectStoreKey = 'ProjectStoreKey';

/** @public */
export const ProjectMemberStoreKey = 'ProjectMemberStoreKey';

/** @public */
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/** @public */
export const ProjectActiveFilter: IProjectActiveFilter = [
    { deletedAt: null },
    { deletedAt: { isSet: false } },
];

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
