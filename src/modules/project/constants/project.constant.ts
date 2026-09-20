import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Request-store key holding the project the project guard resolved.
 * @public
 */
export const ProjectStoreKey = 'ProjectStore';

/**
 * Request-store key holding the caller's project membership.
 * @public
 */
export const ProjectMemberStoreKey = 'ProjectMemberStore';

/**
 * Request-store key holding whether `ProjectRoleGuard` let the caller through on the workspace-owner bypass instead of a `ProjectMember` row.
 * @public
 */
export const ProjectWorkspaceOwnerStoreKey = 'ProjectWorkspaceOwnerStore';

/**
 * Route metadata key holding the project roles `@ProjectMemberProtected` requires.
 * @public
 */
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/**
 * Project guard error kit for `@ProjectProtected`.
 * @public
 */
export const DocProjectErrorResponses = {
    notFound: DocResponseError(
        HttpStatus.NOT_FOUND,
        {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        },
        {
            statusCode: EnumProjectStatusCodeError.notFound,
            messagePath: 'project.error.notFound',
        }
    ),
} as const;

/**
 * Project member guard error kit for role-less `@ProjectMemberProtected`.
 * @public
 */
export const DocProjectMemberErrorResponses = {
    notFound: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumProjectStatusCodeError.notFound,
        messagePath: 'project.error.notFound',
    }),
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumProjectStatusCodeError.memberForbidden,
        messagePath: 'project.error.memberForbidden',
    }),
} as const;

/**
 * Project role guard error kit for role-gated `@ProjectMemberProtected`.
 * @public
 */
export const DocProjectRoleErrorResponses = {
    notFound: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumProjectStatusCodeError.notFound,
        messagePath: 'project.error.notFound',
    }),
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumProjectStatusCodeError.roleForbidden,
        messagePath: 'project.error.roleForbidden',
    }),
} as const;

/**
 * Matches a `Project` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 * @public
 */
export const ProjectActiveFilter: NonNullable<Prisma.ProjectWhereInput['OR']> =
    [{ deletedAt: null }, { deletedAt: { isSet: false } }];

/**
 * The only workspace role that sees and manages every project without a `ProjectMember` row.
 * @public
 */
export const ProjectWorkspaceBypassRole = EnumWorkspaceMemberRole.owner;
