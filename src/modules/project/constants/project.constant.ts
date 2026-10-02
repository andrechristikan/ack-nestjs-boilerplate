import { EnumPolicySubject, Prisma } from '@generated/prisma-client/client';
import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { RoleSelect } from '@modules/role/constants/role.constant';
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
 * Subjects the project `/permissions/:projectId` endpoint reports on.
 * @public
 */
export const ProjectPermissionSubjects: EnumPolicySubject[] = [
    EnumPolicySubject.Project,
    EnumPolicySubject.ProjectMember,
];

/**
 * Route metadata key holding whether `@ProjectMemberProtected` requires a `ProjectMember` row (`true`, the default) or only loads its policies when one exists (`false`).
 * @public
 */
export const ProjectMemberRequiredMetaKey = 'ProjectMemberRequiredMetaKey';

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
 * Project member guard error kits for strict `@ProjectMemberProtected()` and `@ProjectPolicyProtected`.
 * @public
 */
export const DocProjectMemberErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumProjectStatusCodeError.memberForbidden,
        messagePath: 'project.error.memberForbidden',
    }),
    notFound: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumProjectStatusCodeError.memberNotFound,
        messagePath: 'project.error.memberNotFound',
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
 * Relations the project member guard read loads: the project role identity.
 * @public
 */
export const ProjectMemberRoleInclude = {
    role: { select: RoleSelect },
} as const satisfies Prisma.ProjectMemberInclude;
