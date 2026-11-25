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
import type { IWorkspaceInvitePreview } from '@modules/workspace/interfaces/workspace.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspacePreviewInviteUseCase } from '@modules/workspace/use-cases/workspace.preview-invite.use-case';
import { buildWorkspace } from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('WorkspacePreviewInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspace: Workspace = buildWorkspace();
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
    const previewInvite: IWorkspaceInvitePreview = {
        ...invite,
        workspace,
        invitedBy: {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    };
    let useCase: WorkspacePreviewInviteUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePreviewInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                UserUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(WorkspacePreviewInviteUseCase);
    });

    describe('execute', () => {
        it('validates the token once and maps the preview from the invite it returns', async () => {
            const preview = {
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            };
            workspaceInviteService.validateInviteToken.mockResolvedValue(
                previewInvite
            );
            workspaceInviteService.mapInvitePreview.mockReturnValue(preview);

            const result = await useCase.execute({
                inviteToken: 'raw-token',
            });

            expect(result).toEqual({ data: preview });
            expect(
                workspaceInviteService.validateInviteToken
            ).toHaveBeenCalledExactlyOnceWith('raw-token');
            expect(
                workspaceInviteService.mapInvitePreview
            ).toHaveBeenCalledExactlyOnceWith(previewInvite, 'Jane Doe');
        });

        it('throws WorkspaceInviteInvalidException and maps nothing when the token is not valid', async () => {
            workspaceInviteService.validateInviteToken.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute({ inviteToken: 'raw-token' })
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
            expect(
                workspaceInviteService.mapInvitePreview
            ).not.toHaveBeenCalled();
        });
    });
});
