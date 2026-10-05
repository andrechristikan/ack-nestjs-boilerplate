import {
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { WorkspaceInviteResponseSchema } from '@modules/workspace/dtos/response/workspace.invite.response.dto';

describe('WorkspaceInviteResponseSchema', () => {
    const row = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-1',
        projectRole: EnumProjectMemberRole.member,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspaceInviteResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('allows null projectId, projectRole, acceptedAt, and acceptedByUserId', () => {
        const result = WorkspaceInviteResponseSchema.parse({
            ...row,
            projectId: null,
            projectRole: null,
        });

        expect(result.projectId).toBeNull();
        expect(result.projectRole).toBeNull();
    });

    it('strips deletedAt, deletedBy, and an undeclared key such as the hashed token', () => {
        const result = WorkspaceInviteResponseSchema.parse({
            ...row,
            deletedAt: new Date('2026-03-01T00:00:00.000Z'),
            deletedBy: 'user-2',
            tokenHash: 'hashed-token',
        });

        expect(result).toEqual(row);
    });
});
