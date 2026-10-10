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
    EnumPolicySubject.DeviceOwnership,
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
 * Builds a workspace-scoped rule. The condition is judged against the real
 * record, so the key must exist on the subject's model: `Workspace` is the
 * workspace itself (`id`); every other subject carries `workspaceId`
 * (`WorkspaceAnalytic` has no model and is a subject-type check only).
 */
const workspaceRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): IMigrationPolicyRule =>
    rule(subject, action, {
        [subject === EnumPolicySubject.Workspace ? 'id' : 'workspaceId']:
            EnumPolicyConditionPlaceholder.workspaceId,
    });

/**
 * Builds a project-scoped rule. `Project` is the project itself (`id`);
 * every other subject carries `projectId`.
 */
const projectRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): IMigrationPolicyRule =>
    rule(subject, action, {
        [subject === EnumPolicySubject.Project ? 'id' : 'projectId']:
            EnumPolicyConditionPlaceholder.projectId,
    });

const projectCreateRule = (): IMigrationPolicyRule =>
    rule(EnumPolicySubject.Project, [EnumPolicyAction.create]);

/**
 * `Project` read limited to the workspace's projects the caller is a member
 * of. The `members` relation is a list-query predicate: a record check on a
 * `Project` loaded without `members` does not match it, so a project route
 * relies on the caller's project role instead.
 */
const assignedProjectReadRule = (): IMigrationPolicyRule =>
    rule(EnumPolicySubject.Project, [EnumPolicyAction.read], {
        workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
        members: {
            some: { userId: EnumPolicyConditionPlaceholder.userId },
        },
    });

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
            rule(EnumPolicySubject.Analytic, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.Workspace, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.WorkspaceMember, [EnumPolicyAction.read]),
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
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            projectCreateRule(),
            workspaceRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceAnalytic, [
                EnumPolicyAction.read,
            ]),
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
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceJoinRequest, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            projectCreateRule(),
            workspaceRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            workspaceRule(EnumPolicySubject.WorkspaceAnalytic, [
                EnumPolicyAction.read,
            ]),
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        policies: [
            workspaceRule(EnumPolicySubject.Workspace, [EnumPolicyAction.read]),
            workspaceRule(EnumPolicySubject.WorkspaceMember, [
                EnumPolicyAction.read,
            ]),
            assignedProjectReadRule(),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        policies: [
            projectRule(EnumPolicySubject.Project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
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
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.read,
            ]),
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        policies: [
            projectRule(EnumPolicySubject.Project, [EnumPolicyAction.read]),
            projectRule(EnumPolicySubject.ProjectMember, [
                EnumPolicyAction.read,
            ]),
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
