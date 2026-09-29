import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { EnumWorkspaceInviteStatus } from '@generated/prisma-client/client';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceUtil', () => {
    let util: WorkspaceUtil;

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };

    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkspaceUtil],
        }).compile();

        util = module.get(WorkspaceUtil);
    });

    describe('mapInvitePreview', () => {
        it('uses the inviter name when present', () => {
            const inviter: IWorkspaceInviteInviter = {
                name: 'Jane Doe',
                username: 'jane',
            };

            const result = util.mapInvitePreview(workspace, invite, inviter);

            expect(result).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            });
        });

        it('falls back to the inviter username when the name is null', () => {
            const inviter: IWorkspaceInviteInviter = {
                name: null,
                username: 'jane',
            };

            const result = util.mapInvitePreview(workspace, invite, inviter);

            expect(result.inviterName).toBe('jane');
        });

        it('falls back to the workspace name when the inviter is null', () => {
            const result = util.mapInvitePreview(workspace, invite, null);

            expect(result.inviterName).toBe('Acme');
        });
    });
});
