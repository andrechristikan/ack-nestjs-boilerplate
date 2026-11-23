import {
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { IPolicyRoleScopeSubjectContract } from '@modules/policy/interfaces/policy.interface';

/** @public */
export const PolicyRoleScopeSubjectContract: IPolicyRoleScopeSubjectContract = {
    [EnumRoleScope.platform]: [
        EnumPolicySubject.all,
        EnumPolicySubject.ApiKey,
        EnumPolicySubject.Role,
        EnumPolicySubject.User,
        EnumPolicySubject.Session,
        EnumPolicySubject.ActivityLog,
        EnumPolicySubject.PasswordHistory,
        EnumPolicySubject.TermPolicy,
        EnumPolicySubject.FeatureFlag,
        EnumPolicySubject.Device,
        EnumPolicySubject.DeviceOwnership,
        EnumPolicySubject.Workspace,
        EnumPolicySubject.WorkspaceMember,
        EnumPolicySubject.Project,
        EnumPolicySubject.Analytic,
    ],
    [EnumRoleScope.workspace]: [
        EnumPolicySubject.Workspace,
        EnumPolicySubject.WorkspaceMember,
        EnumPolicySubject.WorkspaceInvite,
        EnumPolicySubject.WorkspaceJoinRequest,
        EnumPolicySubject.Project,
        EnumPolicySubject.ProjectMember,
        EnumPolicySubject.WorkspaceAnalytic,
    ],
    [EnumRoleScope.project]: [
        EnumPolicySubject.Project,
        EnumPolicySubject.ProjectMember,
    ],
};
