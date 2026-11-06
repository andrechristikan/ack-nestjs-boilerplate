import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import type { IProjectActiveFilter } from '@modules/project/interfaces/project.interface';

/**
 * Request-store key holding the project the project guard resolved.
 * @public
 */
export const ProjectStoreKey = 'ProjectStoreKey';

/**
 * Request-store key holding the caller's project membership.
 * @public
 */
export const ProjectMemberStoreKey = 'ProjectMemberStoreKey';

/**
 * Route metadata key holding the project roles `@ProjectMemberProtected` requires.
 * @public
 */
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/**
 * Matches a `Project` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 * @public
 */
export const ProjectActiveFilter: IProjectActiveFilter = [
    { deletedAt: null },
    { deletedAt: { isSet: false } },
];

/**
 * The workspace roles that see and manage every project without a `ProjectMember` row.
 * @public
 */
export const ProjectBypassRoles: EnumWorkspaceMemberRole[] = [
    EnumWorkspaceMemberRole.owner,
    EnumWorkspaceMemberRole.admin,
];

/**
 * Error entries `@ProjectProtected` documents: the missing project and the missing workspace store.
 * @public
 */
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

/**
 * Error entries the role-less `@ProjectMemberProtected()` documents for `ProjectMemberGuard`: the non-member caller and the missing user and project stores.
 * @public
 */
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

/**
 * Error entries `@ProjectMemberProtected(...roles)` documents for `ProjectRoleGuard`: the non-member caller, the forbidden role, and the missing project and workspace member stores.
 * @public
 */
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
