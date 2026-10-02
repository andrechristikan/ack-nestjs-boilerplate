import { EnumPolicySubject } from '@generated/prisma-client';
import { WorkspacePermissionSubjects } from '@modules/workspace/constants/workspace.constant';

describe('WorkspacePermissionSubjects', () => {
    it('omits ProjectMember, which needs a project in context', () => {
        expect(WorkspacePermissionSubjects).not.toContain(
            EnumPolicySubject.ProjectMember
        );
    });
});
