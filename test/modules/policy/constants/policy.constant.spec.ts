import { EnumPolicySubject } from '@generated/prisma-client/client';
import { PolicySubjectScope } from '@modules/policy/constants/policy.constant';

describe('PolicySubjectScope', () => {
    it('contains only subjects with authorization scope metadata', () => {
        expect(Object.keys(PolicySubjectScope).sort()).toEqual(
            [
                EnumPolicySubject.Workspace,
                EnumPolicySubject.WorkspaceMember,
                EnumPolicySubject.WorkspaceInvite,
                EnumPolicySubject.WorkspaceJoinRequest,
                EnumPolicySubject.Project,
                EnumPolicySubject.ProjectMember,
                EnumPolicySubject.analytic,
            ].sort()
        );
    });

    it.each([
        [
            EnumPolicySubject.Workspace,
            { key: 'id', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.WorkspaceMember,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.WorkspaceInvite,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.WorkspaceJoinRequest,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.Project,
            { key: 'id', placeholder: '${project.id}' },
        ],
        [
            EnumPolicySubject.ProjectMember,
            { key: 'projectId', placeholder: '${project.id}' },
        ],
        [
            EnumPolicySubject.analytic,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
    ])('defines the scope pair for %s', (subject, scope) => {
        expect(PolicySubjectScope[subject]).toEqual(scope);
    });
});
