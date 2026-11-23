import { EnumRoleScope } from '@generated/prisma-client/client';
import { WorkspaceInvitePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';

describe('WorkspaceInvitePreviewResponseSchema', () => {
    const row = {
        workspaceName: 'Acme',
        inviterName: 'Jane Doe',
        workspaceRole: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'Member',
        },
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspaceInvitePreviewResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key such as the token or an internal id', () => {
        const result = WorkspaceInvitePreviewResponseSchema.parse({
            ...row,
            id: 'invite-1',
            inviteToken: 'secret-token',
        });

        expect(result).toEqual(row);
    });

    it('strips the policy revision the role reference carries', () => {
        const result = WorkspaceInvitePreviewResponseSchema.parse({
            ...row,
            workspaceRole: { ...row.workspaceRole, policyRevision: 3 },
        });

        expect(result).toEqual(row);
    });
});
