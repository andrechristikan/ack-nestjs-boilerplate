import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { WorkspaceInvitePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
describe('WorkspaceInvitePreviewResponseSchema', () => {
    it('selects safe preview fields and strips identifiers and tokens', () => {
        const result = WorkspaceInvitePreviewResponseSchema.parse({
            workspaceName: 'Workspace',
            inviterName: 'Inviter',
            workspaceRole: EnumWorkspaceMemberRole.member,
            expiredAt: new Date(),
            id: 'invite-id',
            token: 'secret',
        });
        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('token');
    });
});
