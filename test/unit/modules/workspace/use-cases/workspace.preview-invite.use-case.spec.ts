import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { WorkspacePreviewInviteUseCase } from '@modules/workspace/use-cases/workspace.preview-invite.use-case';

describe('WorkspacePreviewInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
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
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    let useCase: WorkspacePreviewInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePreviewInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: UserService, useValue: userService },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
            ],
        }).compile();

        useCase = module.get(WorkspacePreviewInviteUseCase);
    });

    describe('execute', () => {
        it('validates the token, reads the workspace and inviter together, and maps the preview', async () => {
            const inviter = { name: 'Jane Doe', username: 'jane' };
            const preview = {
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            };
            workspaceInviteService.validateInviteToken.mockResolvedValue(
                invite
            );
            workspaceInviteService.getWorkspaceOfInvite.mockResolvedValue(
                workspace
            );
            userService.getNameById.mockResolvedValue(inviter);
            workspaceUtil.mapInvitePreview.mockReturnValue(preview);

            const result = await useCase.execute({
                inviteToken: 'raw-token',
            });

            expect(result).toEqual({ data: preview });
            expect(
                workspaceInviteService.validateInviteToken
            ).toHaveBeenCalledWith('raw-token');
            expect(
                workspaceInviteService.getWorkspaceOfInvite
            ).toHaveBeenCalledWith(invite);
            expect(userService.getNameById).toHaveBeenCalledWith('user-1');
            expect(workspaceUtil.mapInvitePreview).toHaveBeenCalledWith(
                workspace,
                invite,
                inviter
            );
        });

        it('throws WorkspaceInviteInvalidException when the invite workspace is not active', async () => {
            workspaceInviteService.validateInviteToken.mockResolvedValue(
                invite
            );
            workspaceInviteService.getWorkspaceOfInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userService.getNameById.mockResolvedValue(null);

            await expect(
                useCase.execute({ inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(workspaceUtil.mapInvitePreview).not.toHaveBeenCalled();
        });
    });
});
