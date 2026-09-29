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
import { scopedCondition } from '@modules/policy/utils/policy.condition.util';
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

/**
 * Builds a seeded rule whose conditions come from `scopedCondition` for the same actions.
 */
const scopedRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): IMigrationPolicyRule =>
    rule(subject, action, scopedCondition(subject, action));

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
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
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
            scopedRule(EnumPolicySubject.Workspace, [EnumPolicyAction.manage]),
            scopedRule(EnumPolicySubject.WorkspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            scopedRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.Project, [EnumPolicyAction.create]),
            scopedRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        policies: [
            scopedRule(EnumPolicySubject.Workspace, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.WorkspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            scopedRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.Project, [EnumPolicyAction.create]),
            scopedRule(EnumPolicySubject.Project, [EnumPolicyAction.delete]),
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        policies: [
            scopedRule(EnumPolicySubject.Workspace, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        policies: [
            scopedRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.ProjectMember, [
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
            scopedRule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        policies: [
            scopedRule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
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
