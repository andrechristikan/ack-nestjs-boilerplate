import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicySubject, Prisma } from '@generated/prisma-client/client';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

export type PolicySubjectScopeEntry = {
    key: 'id' | 'workspaceId' | 'projectId';
    placeholder: '${workspace.id}' | '${project.id}';
};

/**
 * Route metadata key holding the policy abilities `@PolicyProtected` requires.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the CASL ability built once per request from the composed policies.
 * @public
 */
export const PolicyAbilityStoreKey = 'PolicyAbilityStore';

/**
 * Policy guard error kit for `@PolicyProtected`.
 * @public
 */
export const DocPolicyErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumPolicyStatusCodeError.forbidden,
        messagePath: 'policy.error.forbidden',
    }),
    predefinedNotFound: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
        messagePath: 'policy.error.predefinedNotFound',
    }),
} as const;

/** Scope metadata that is specific to this authorization model and cannot be inferred by CASL. */
export const PolicySubjectScope = {
    [EnumPolicySubject.Workspace]: {
        key: Prisma.WorkspaceScalarFieldEnum.id,
        placeholder: '${workspace.id}',
    },
    [EnumPolicySubject.WorkspaceMember]: {
        key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
        placeholder: '${workspace.id}',
    },
    [EnumPolicySubject.WorkspaceInvite]: {
        key: Prisma.WorkspaceInviteScalarFieldEnum.workspaceId,
        placeholder: '${workspace.id}',
    },
    [EnumPolicySubject.WorkspaceJoinRequest]: {
        key: Prisma.WorkspaceJoinRequestScalarFieldEnum.workspaceId,
        placeholder: '${workspace.id}',
    },
    [EnumPolicySubject.Project]: {
        key: Prisma.ProjectScalarFieldEnum.id,
        placeholder: '${project.id}',
    },
    [EnumPolicySubject.ProjectMember]: {
        key: Prisma.ProjectMemberScalarFieldEnum.projectId,
        placeholder: '${project.id}',
    },
    [EnumPolicySubject.analytic]: {
        key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
        placeholder: '${workspace.id}',
    },
} as const satisfies Partial<
    Record<EnumPolicySubject, PolicySubjectScopeEntry>
>;
