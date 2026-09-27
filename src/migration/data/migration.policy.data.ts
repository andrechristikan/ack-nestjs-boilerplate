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
    EnumPolicySubject.activityLog,
    EnumPolicySubject.apiKey,
    EnumPolicySubject.device,
    EnumPolicySubject.featureFlag,
    EnumPolicySubject.passwordHistory,
    EnumPolicySubject.role,
    EnumPolicySubject.session,
    EnumPolicySubject.termPolicy,
    EnumPolicySubject.user,
];

/**
 * Builds a seeded, non-inverted rule with no reason. Priority is assigned by `prioritize`.
 */
const rule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[],
    conditions: IMigrationPolicyRule['conditions'] = null
): Omit<IMigrationPolicyRule, 'priority'> => ({
    subject,
    action,
    conditions,
    inverted: false,
    reason: null,
});

/**
 * Builds a seeded rule whose conditions come from `scopedCondition` for the same actions.
 */
const scopedRule = (
    subject: EnumPolicySubject,
    action: EnumPolicyAction[]
): Omit<IMigrationPolicyRule, 'priority'> =>
    rule(subject, action, scopedCondition(subject, action));

/**
 * Numbers a role's rules 1-based with no gaps, in array order.
 */
const prioritize = (
    rules: Omit<IMigrationPolicyRule, 'priority'>[]
): IMigrationPolicyRule[] =>
    rules.map((item, index) => ({ ...item, priority: index + 1 }));

const PolicyData: IMigrationPolicyData[] = [
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        policies: prioritize([
            rule(EnumPolicySubject.all, [EnumPolicyAction.manage]),
        ]),
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        policies: prioritize([
            ...PlatformAdminSubjects.map(subject =>
                rule(subject, Object.values(EnumPolicyAction))
            ),
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.workspace, [EnumPolicyAction.read]),
            rule(EnumPolicySubject.project, [EnumPolicyAction.read]),
        ]),
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policies: [],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.owner,
        policies: prioritize([
            scopedRule(EnumPolicySubject.workspace, [EnumPolicyAction.manage]),
            scopedRule(EnumPolicySubject.workspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.workspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            scopedRule(EnumPolicySubject.workspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.project, [EnumPolicyAction.create]),
            scopedRule(EnumPolicySubject.project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.projectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ]),
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        policies: prioritize([
            scopedRule(EnumPolicySubject.workspace, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.workspaceMember, [
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
            scopedRule(EnumPolicySubject.workspaceInvite, [
                EnumPolicyAction.manage,
            ]),
            scopedRule(EnumPolicySubject.workspaceJoinRequest, [
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.project, [EnumPolicyAction.create]),
            scopedRule(EnumPolicySubject.project, [EnumPolicyAction.delete]),
            scopedRule(EnumPolicySubject.analytic, [EnumPolicyAction.read]),
        ]),
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        policies: prioritize([
            scopedRule(EnumPolicySubject.workspace, [EnumPolicyAction.read]),
        ]),
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        policies: prioritize([
            scopedRule(EnumPolicySubject.project, [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
            ]),
            scopedRule(EnumPolicySubject.projectMember, [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]),
        ]),
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.member,
        policies: prioritize([
            scopedRule(EnumPolicySubject.project, [EnumPolicyAction.read]),
        ]),
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        policies: prioritize([
            scopedRule(EnumPolicySubject.project, [EnumPolicyAction.read]),
        ]),
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
