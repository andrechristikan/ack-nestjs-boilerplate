import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    IMigrationPolicyData,
    IMigrationPolicyGrant,
} from '@migration/interfaces/migration.interface';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import { PolicyRoleScopeSubjectContract } from '@modules/policy/contracts/policy.role-scope-subject.contract';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';

const Crud: EnumPolicyAction[] = [
    EnumPolicyAction.create,
    EnumPolicyAction.read,
    EnumPolicyAction.update,
    EnumPolicyAction.delete,
];

const PlatformAdminLimitedSubjects: ReadonlySet<EnumPolicySubject> = new Set([
    EnumPolicySubject.all,
    EnumPolicySubject.Workspace,
    EnumPolicySubject.WorkspaceMember,
    EnumPolicySubject.Project,
    EnumPolicySubject.Analytic,
]);

const PlatformAdminFullSubjects: EnumPolicySubject[] =
    PolicyRoleScopeSubjectContract[EnumRoleScope.platform].filter(
        subject => !PlatformAdminLimitedSubjects.has(subject)
    );

const PlatformAdminGrants: IMigrationPolicyGrant[] = [
    ...PlatformAdminFullSubjects.map((subject): IMigrationPolicyGrant => [
        subject,
        Object.values(EnumPolicyAction),
    ]),
    [
        EnumPolicySubject.Workspace,
        [EnumPolicyAction.read, EnumPolicyAction.update],
    ],
    [EnumPolicySubject.WorkspaceMember, [EnumPolicyAction.read]],
    [EnumPolicySubject.Project, [EnumPolicyAction.read]],
    [EnumPolicySubject.Analytic, [EnumPolicyAction.read]],
];

const WorkspaceOwnerGrants: IMigrationPolicyGrant[] = [
    [EnumPolicySubject.Workspace, [EnumPolicyAction.manage]],
    [
        EnumPolicySubject.WorkspaceMember,
        [
            EnumPolicyAction.read,
            EnumPolicyAction.update,
            EnumPolicyAction.delete,
        ],
    ],
    [EnumPolicySubject.WorkspaceInvite, [EnumPolicyAction.manage]],
    [
        EnumPolicySubject.WorkspaceJoinRequest,
        [EnumPolicyAction.read, EnumPolicyAction.update],
    ],
    [EnumPolicySubject.Project, Crud],
    [EnumPolicySubject.WorkspaceAnalytic, [EnumPolicyAction.read]],
];

const WorkspaceAdminGrants: IMigrationPolicyGrant[] = [
    [
        EnumPolicySubject.Workspace,
        [EnumPolicyAction.read, EnumPolicyAction.update],
    ],
    ...WorkspaceOwnerGrants.filter(
        ([subject]) => subject !== EnumPolicySubject.Workspace
    ),
];

const WorkspaceMemberGrants: IMigrationPolicyGrant[] = [
    [EnumPolicySubject.Workspace, [EnumPolicyAction.read]],
    [EnumPolicySubject.WorkspaceMember, [EnumPolicyAction.read]],
];

const ProjectAdminGrants: IMigrationPolicyGrant[] = [
    [
        EnumPolicySubject.Project,
        [
            EnumPolicyAction.read,
            EnumPolicyAction.update,
            EnumPolicyAction.delete,
        ],
    ],
    [EnumPolicySubject.ProjectMember, Crud],
];

const ProjectReaderGrants: IMigrationPolicyGrant[] = [
    [EnumPolicySubject.Project, [EnumPolicyAction.read]],
    [EnumPolicySubject.ProjectMember, [EnumPolicyAction.read]],
];

const PolicyData: IMigrationPolicyData[] = [
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        policies: [
            {
                subject: EnumPolicySubject.all,
                action: [EnumPolicyAction.manage],
                conditions: null,
                inverted: false,
                reason: null,
            },
        ],
    },
    {
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        policies: PlatformAdminGrants.map(([subject, action]) => ({
            subject,
            action,
            conditions: null,
            inverted: false,
            reason: null,
        })),
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
            ...WorkspaceOwnerGrants.map(([subject, action]) => ({
                subject,
                action,
                conditions: {
                    [subject === EnumPolicySubject.Workspace
                        ? 'id'
                        : 'workspaceId']:
                        EnumPolicyConditionPlaceholder.workspaceId,
                },
                inverted: false,
                reason: null,
            })),
            {
                subject: EnumPolicySubject.ProjectMember,
                action: Crud,
                conditions: {
                    projectId: EnumPolicyConditionPlaceholder.projectId,
                },
                inverted: false,
                reason: null,
            },
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        policies: [
            ...WorkspaceAdminGrants.map(([subject, action]) => ({
                subject,
                action,
                conditions: {
                    [subject === EnumPolicySubject.Workspace
                        ? 'id'
                        : 'workspaceId']:
                        EnumPolicyConditionPlaceholder.workspaceId,
                },
                inverted: false,
                reason: null,
            })),
            {
                subject: EnumPolicySubject.ProjectMember,
                action: Crud,
                conditions: {
                    projectId: EnumPolicyConditionPlaceholder.projectId,
                },
                inverted: false,
                reason: null,
            },
        ],
    },
    {
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        policies: [
            ...WorkspaceMemberGrants.map(([subject, action]) => ({
                subject,
                action,
                conditions: {
                    [subject === EnumPolicySubject.Workspace
                        ? 'id'
                        : 'workspaceId']:
                        EnumPolicyConditionPlaceholder.workspaceId,
                },
                inverted: false,
                reason: null,
            })),
            {
                subject: EnumPolicySubject.Project,
                action: [EnumPolicyAction.read],
                conditions: {
                    workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
                    members: {
                        some: { userId: EnumPolicyConditionPlaceholder.userId },
                    },
                },
                inverted: false,
                reason: null,
            },
        ],
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.admin,
        policies: ProjectAdminGrants.map(([subject, action]) => ({
            subject,
            action,
            conditions: {
                [subject === EnumPolicySubject.Project ? 'id' : 'projectId']:
                    EnumPolicyConditionPlaceholder.projectId,
            },
            inverted: false,
            reason: null,
        })),
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.member,
        policies: ProjectReaderGrants.map(([subject, action]) => ({
            subject,
            action,
            conditions: {
                [subject === EnumPolicySubject.Project ? 'id' : 'projectId']:
                    EnumPolicyConditionPlaceholder.projectId,
            },
            inverted: false,
            reason: null,
        })),
    },
    {
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        policies: ProjectReaderGrants.map(([subject, action]) => ({
            subject,
            action,
            conditions: {
                [subject === EnumPolicySubject.Project ? 'id' : 'projectId']:
                    EnumPolicyConditionPlaceholder.projectId,
            },
            inverted: false,
            reason: null,
        })),
    },
];

export const MigrationPolicyData: Record<
    EnumAppEnvironment,
    IMigrationPolicyData[]
> = {
    [EnumAppEnvironment.local]: PolicyData,
    [EnumAppEnvironment.development]: PolicyData,
    [EnumAppEnvironment.staging]: PolicyData,
    [EnumAppEnvironment.production]: PolicyData,
};
