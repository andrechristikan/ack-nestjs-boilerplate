import {
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { PolicyRoleScopeSubjectContract } from '@modules/policy/contracts/policy.role-scope-subject.contract';
import { PolicyNonModelSubjects } from '@modules/policy/constants/policy.constant';

describe('PolicyRoleScopeSubjectContract', () => {
    it('has a row for every role scope', () => {
        expect(Object.keys(PolicyRoleScopeSubjectContract).sort()).toEqual(
            Object.values(EnumRoleScope).sort()
        );
    });

    it.each([
        [
            EnumRoleScope.platform,
            [
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
        ],
        [
            EnumRoleScope.workspace,
            [
                EnumPolicySubject.Workspace,
                EnumPolicySubject.WorkspaceMember,
                EnumPolicySubject.WorkspaceInvite,
                EnumPolicySubject.WorkspaceJoinRequest,
                EnumPolicySubject.Project,
                EnumPolicySubject.ProjectMember,
                EnumPolicySubject.WorkspaceAnalytic,
            ],
        ],
        [
            EnumRoleScope.project,
            [EnumPolicySubject.Project, EnumPolicySubject.ProjectMember],
        ],
    ])('lists the subjects the %s scope may grant', (scope, subjects) => {
        expect([...PolicyRoleScopeSubjectContract[scope]].sort()).toEqual(
            [...subjects].sort()
        );
    });

    it('names the non-model subjects', () => {
        expect([...PolicyNonModelSubjects].sort()).toEqual(
            [EnumPolicySubject.all, EnumPolicySubject.Analytic].sort()
        );
    });
});
