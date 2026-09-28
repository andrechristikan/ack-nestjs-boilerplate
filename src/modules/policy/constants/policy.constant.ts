import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicySubject, Prisma } from '@generated/prisma-client/client';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type { IPolicySubjectDefinition } from '@modules/policy/interfaces/policy.interface';

/**
 * Route metadata key holding the policy abilities `@PolicyProtected` requires.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the caller's platform role policies, written by the user guard.
 * @public
 */
export const PolicyStoreKey = 'PolicyStore';

/**
 * Request-store key holding the policies of the caller's workspace role, written by the workspace member guard.
 * @public
 */
export const WorkspaceMemberPolicyStoreKey = 'WorkspaceMemberPolicyStore';

/**
 * Request-store key holding the policies of the caller's project role, written by the project member guard.
 * @public
 */
export const ProjectMemberPolicyStoreKey = 'ProjectMemberPolicyStore';

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

/**
 * The registry of every policy subject: the Prisma model an ability rule targets, and the scope
 * pair tying a scoped-role rule to the active workspace or project. Entries with a null `model`
 * are virtual subjects.
 * @public
 */
export const PolicySubjectRegistry = {
    [EnumPolicySubject.all]: {
        model: null,
        scope: null,
    },
    [EnumPolicySubject.workspace]: {
        model: Prisma.ModelName.Workspace,
        scope: {
            key: Prisma.WorkspaceScalarFieldEnum.id,
            placeholder: '${workspace.id}',
        },
    },
    [EnumPolicySubject.workspaceMember]: {
        model: Prisma.ModelName.WorkspaceMember,
        scope: {
            key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    [EnumPolicySubject.workspaceInvite]: {
        model: Prisma.ModelName.WorkspaceInvite,
        scope: {
            key: Prisma.WorkspaceInviteScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    [EnumPolicySubject.workspaceJoinRequest]: {
        model: Prisma.ModelName.WorkspaceJoinRequest,
        scope: {
            key: Prisma.WorkspaceJoinRequestScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    [EnumPolicySubject.project]: {
        model: Prisma.ModelName.Project,
        scope: {
            key: Prisma.ProjectScalarFieldEnum.id,
            placeholder: '${project.id}',
        },
    },
    [EnumPolicySubject.projectMember]: {
        model: Prisma.ModelName.ProjectMember,
        scope: {
            key: Prisma.ProjectMemberScalarFieldEnum.projectId,
            placeholder: '${project.id}',
        },
    },
    [EnumPolicySubject.analytic]: {
        model: null,
        scope: {
            key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    [EnumPolicySubject.activityLog]: {
        model: Prisma.ModelName.ActivityLog,
        scope: null,
    },
    [EnumPolicySubject.apiKey]: {
        model: Prisma.ModelName.ApiKey,
        scope: null,
    },
    [EnumPolicySubject.device]: {
        model: Prisma.ModelName.Device,
        scope: null,
    },
    [EnumPolicySubject.featureFlag]: {
        model: Prisma.ModelName.FeatureFlag,
        scope: null,
    },
    [EnumPolicySubject.passwordHistory]: {
        model: Prisma.ModelName.PasswordHistory,
        scope: null,
    },
    [EnumPolicySubject.role]: {
        model: Prisma.ModelName.Role,
        scope: null,
    },
    [EnumPolicySubject.session]: {
        model: Prisma.ModelName.Session,
        scope: null,
    },
    [EnumPolicySubject.termPolicy]: {
        model: Prisma.ModelName.TermPolicy,
        scope: null,
    },
    [EnumPolicySubject.user]: {
        model: Prisma.ModelName.User,
        scope: null,
    },
} as const satisfies Record<EnumPolicySubject, IPolicySubjectDefinition>;

/**
 * The CASL subject name an ability rule targets for an enum subject: its registry model, or
 * the virtual subject's own name.
 * @public
 */
export function abilitySubjectOf(
    subject: EnumPolicySubject
): Prisma.ModelName | 'all' | 'analytic' {
    const { model } = PolicySubjectRegistry[subject];

    return model ?? (subject === EnumPolicySubject.all ? 'all' : 'analytic');
}
