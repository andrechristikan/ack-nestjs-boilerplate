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
