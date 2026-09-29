import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    IMigrationPolicyData,
    IMigrationPolicyRule,
} from '@migration/interfaces/migration.interface';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

const PlatformAdminSubjects: EnumPolicySubject[] = [
    EnumPolicySubject.ActivityLog,
    EnumPolicySubject.ApiKey,
    EnumPolicySubject.Device,
    EnumPolicySubject.FeatureFlag,
    EnumPolicySubject.PasswordHistory,
    EnumPolicySubject.Role,
    EnumPolicySubject.Session,
    EnumPolicySubject.TermPolicy,
    EnumPolicySubject.User,
];

/**
 * Builds a seeded, non-inverted rule.
 */
const rule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[],
    conditions: IMigrationPolicyRule['conditions'] = null,
    reason: string | null = null
): IMigrationPolicyRule => ({
    subject,
    action,
    conditions,
    inverted: false,
    reason,
});

const workspaceRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): IMigrationPolicyRule =>
    rule(subject, action, {
        workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
    });

const projectRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): IMigrationPolicyRule =>
    rule(subject, action, {
        projectId: EnumPolicyConditionPlaceholder.projectId,
    });

const projectCreateRule = (): IMigrationPolicyRule =>
    rule(EnumPolicySubject.Project, [EnumPolicyAction.create]);

const PolicyData: IMigrationPolicyData[] = [
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        policies: [rule(EnumPolicySubject.all, [EnumPolicyAction.manage])],
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        policies: [
            ...PlatformAdminSubjects.map(subject =>
                rule(subject, Object.values(EnumPolicyAction))
            ),
            rule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.Workspace, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policies: [],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.owner,
        policies: [
            workspaceRule(EnumPolicySubject.Workspace, [
                EnumPolicyAction.manage,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            projectCreateRule(),
            projectRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        policies: [
            workspaceRule(EnumPolicySubject.Workspace, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            projectCreateRule(),
            projectRule(EnumPolicySubject.Project, [EnumPolicyAction.delete]),
            workspaceRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        policies: [
            workspaceRule(EnumPolicySubject.Workspace, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        policies: [
            projectRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.member,
        policies: [
            projectRule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        policies: [
            projectRule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
        ],
    },
];

export const MigrationPolicyData: Record<
    EnumAppEnvironment,
    IMigrationPolicyData[]
> = {
    [EnumAppEnvironment.local]: PolicyData,
    [EnumAppEnvironment.test]: PolicyData,
    [EnumAppEnvironment.development]: PolicyData,
    [EnumAppEnvironment.staging]: PolicyData,
    [EnumAppEnvironment.production]: PolicyData,
};
