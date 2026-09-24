import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceInviteHttpService', () => {
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');
    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;
    const invite = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'invitee@example.com',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        token: 'token',
        reference: 'reference',
        expiredAt,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'inviter-id',
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: 'inviter-id',
        updatedAt: now,
        updatedBy: 'inviter-id',
    } satisfies WorkspaceInvite;
    const inviteListItem = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'invitee@example.com',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'reference',
        expiredAt,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'inviter-id',
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: 'inviter-id',
        updatedAt: now,
        updatedBy: 'inviter-id',
    } satisfies IWorkspaceInviteList;
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [inviteListItem],
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: ['email', 'reference'],
        availableOrderBy: ['createdAt'],
    };

    let service: WorkspaceInviteHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteHttpService,
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(WorkspaceInviteHttpService);
    });

    describe('getInvitesList', () => {
        it('merges the status filter into the store patch when a status is provided', async () => {
            const query = {
                status: 'pending',
            } satisfies WorkspaceInviteListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: ['pending'] } },
                storeFilter: { status: ['pending'] },
            } as never);
            workspaceInviteDomain.getInvitesList.mockResolvedValue(cursorPage);

            const result = await service.getInvitesList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: { status: ['pending'] },
                }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                { status: { in: ['pending'] } }
            );
            expect(result).toEqual(cursorPage);
        });

        it('merges an empty filter set when no status is provided', async () => {
            const query = {} satisfies WorkspaceInviteListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            workspaceInviteDomain.getInvitesList.mockResolvedValue(cursorPage);

            await service.getInvitesList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: {},
                }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                undefined
            );
        });
    });

    describe('createInvite', () => {
        it('delegates to the domain and wraps the created invite', async () => {
            const dto = {
                email: 'invitee@example.com',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: undefined,
                projectRole: undefined,
                expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
            } satisfies WorkspaceInviteCreateRequestDto;
            workspaceInviteDomain.createInvite.mockResolvedValue(invite);

            const result = await service.createInvite(
                workspace,
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: invite });
            expect(workspaceInviteDomain.createInvite).toHaveBeenCalledWith(
                workspace,
                'actor-id',
                {
                    email: dto.email,
                    workspaceRole: dto.workspaceRole,
                    projectId: dto.projectId,
                    projectRole: dto.projectRole,
                    expiryDuration: dto.expiryDuration,
                }
            );
        });
    });

    describe('resendInvite', () => {
        it('delegates to the domain and wraps the resent invite', async () => {
            const dto = {
                expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
            } satisfies WorkspaceInviteResendRequestDto;
            workspaceInviteDomain.resendInvite.mockResolvedValue(invite);

            const result = await service.resendInvite(
                workspace,
                'actor-id',
                'invite-id',
                dto
            );

            expect(result).toEqual({ data: invite });
            expect(workspaceInviteDomain.resendInvite).toHaveBeenCalledWith(
                workspace,
                'actor-id',
                'invite-id',
                dto.expiryDuration
            );
        });
    });

    describe('revokeInvite', () => {
        it('delegates to the domain', async () => {
            await service.revokeInvite('workspace-id', 'actor-id', 'invite-id');

            expect(workspaceInviteDomain.revokeInvite).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                'invite-id'
            );
        });
    });

    describe('claimInvite', () => {
        it('delegates to the domain', async () => {
            const dto = {
                inviteToken: 'invite-token',
            } satisfies WorkspaceInviteClaimRequestDto;

            await service.claimInvite('user-id', 'user@example.com', dto);

            expect(workspaceInviteDomain.claimInvite).toHaveBeenCalledWith(
                'user-id',
                'user@example.com',
                'invite-token'
            );
        });
    });

    describe('previewInvite', () => {
        it('maps the domain preview and wraps it in the response envelope', async () => {
            const inviter = { name: 'Inviter', username: 'inviter' };
            const preview = {
                workspaceName: workspace.name,
                inviterName: inviter.name,
                workspaceRole: invite.workspaceRole,
                expiredAt: invite.expiredAt,
            } satisfies WorkspaceInvitePreviewResponseDto;
            workspaceInviteDomain.previewInvite.mockResolvedValue({
                workspace,
                invite,
                inviter,
            });
            workspaceUtil.mapInvitePreview.mockReturnValue(preview);

            const result = await service.previewInvite('invite-token');

            expect(workspaceInviteDomain.previewInvite).toHaveBeenCalledWith(
                'invite-token'
            );
            expect(workspaceUtil.mapInvitePreview).toHaveBeenCalledWith(
                workspace,
                invite,
                inviter
            );
            expect(result).toEqual({ data: preview });
        });
    });
});
