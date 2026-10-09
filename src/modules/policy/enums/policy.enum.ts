import { EnumPolicySubject } from '@generated/prisma-client/client';

type PolicySubjectSubset = { [K in EnumPolicySubject]?: K };

/**
 * Subjects a `@PlatformPolicyProtected` route may require: a TS-only subset of the persisted
 * Prisma `EnumPolicySubject`.
 * @public
 */
export const EnumPolicyPlatformSubject = {
    all: EnumPolicySubject.all,
    ApiKey: EnumPolicySubject.ApiKey,
    Role: EnumPolicySubject.Role,
    User: EnumPolicySubject.User,
    Session: EnumPolicySubject.Session,
    ActivityLog: EnumPolicySubject.ActivityLog,
    PasswordHistory: EnumPolicySubject.PasswordHistory,
    TermPolicy: EnumPolicySubject.TermPolicy,
    FeatureFlag: EnumPolicySubject.FeatureFlag,
    Device: EnumPolicySubject.Device,
    DeviceOwnership: EnumPolicySubject.DeviceOwnership,
    Workspace: EnumPolicySubject.Workspace,
    WorkspaceMember: EnumPolicySubject.WorkspaceMember,
    Project: EnumPolicySubject.Project,
    Analytic: EnumPolicySubject.Analytic,
} as const satisfies PolicySubjectSubset;

/**
 * Member of `EnumPolicyPlatformSubject`.
 * @public
 */
export type EnumPolicyPlatformSubject =
    (typeof EnumPolicyPlatformSubject)[keyof typeof EnumPolicyPlatformSubject];

/**
 * Subjects a `@WorkspacePolicyProtected` route may require: a TS-only subset of the persisted
 * Prisma `EnumPolicySubject`.
 * @public
 */
export const EnumPolicyWorkspaceSubject = {
    Workspace: EnumPolicySubject.Workspace,
    WorkspaceMember: EnumPolicySubject.WorkspaceMember,
    WorkspaceInvite: EnumPolicySubject.WorkspaceInvite,
    WorkspaceJoinRequest: EnumPolicySubject.WorkspaceJoinRequest,
    Project: EnumPolicySubject.Project,
    WorkspaceAnalytic: EnumPolicySubject.WorkspaceAnalytic,
} as const satisfies PolicySubjectSubset;

/**
 * Member of `EnumPolicyWorkspaceSubject`.
 * @public
 */
export type EnumPolicyWorkspaceSubject =
    (typeof EnumPolicyWorkspaceSubject)[keyof typeof EnumPolicyWorkspaceSubject];

/**
 * Subjects a `@ProjectPolicyProtected` route may require: a TS-only subset of the persisted
 * Prisma `EnumPolicySubject`.
 * @public
 */
export const EnumPolicyProjectSubject = {
    Project: EnumPolicySubject.Project,
    ProjectMember: EnumPolicySubject.ProjectMember,
} as const satisfies PolicySubjectSubset;

/**
 * Member of `EnumPolicyProjectSubject`.
 * @public
 */
export type EnumPolicyProjectSubject =
    (typeof EnumPolicyProjectSubject)[keyof typeof EnumPolicyProjectSubject];

/**
 * Every subject a policy decorator can require, across the three scopes.
 * @public
 */
export type PolicySubject =
    | EnumPolicyPlatformSubject
    | EnumPolicyWorkspaceSubject
    | EnumPolicyProjectSubject;
