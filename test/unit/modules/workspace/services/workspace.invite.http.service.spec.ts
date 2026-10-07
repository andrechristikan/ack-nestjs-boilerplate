import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
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
    };

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceInviteHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

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
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceInviteHttpService);
    });

    describe('getInvitesList', () => {
        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceInviteListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: { status: { in: [EnumWorkspaceInviteStatus.pending] } },
                storeFilter: { status: [EnumWorkspaceInviteStatus.pending] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteDomain.getInvitesList.mockResolvedValue(page);

            await service.getInvitesList('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: WorkspaceInviteDefaultAvailableSearch,
                availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceInviteScalarFieldEnum.status,
                'pending',
                WorkspaceInviteDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { status: [EnumWorkspaceInviteStatus.pending] } }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteDomain.getInvitesList.mockResolvedValue(page);

            await service.getInvitesList('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });

    describe('createInvite', () => {
        it('creates the invite and wraps it in the response envelope', async () => {
            const body: WorkspaceInviteCreateRequestDto = {
                email: 'invitee@example.com' as Lowercase<string>,
                workspaceRole: EnumWorkspaceMemberRole.member,
            };
            workspaceInviteDomain.createInvite.mockResolvedValue(invite);

            const result = await service.createInvite(
                workspace,
                'user-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(workspaceInviteDomain.createInvite).toHaveBeenCalledWith(
                workspace,
                'user-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                }
            );
        });
    });

    describe('resendInvite', () => {
        it('renews the invite and wraps it in the response envelope', async () => {
            const body: WorkspaceInviteResendRequestDto = {};
            workspaceInviteDomain.resendInvite.mockResolvedValue(invite);

            const result = await service.resendInvite(
                workspace,
                'user-1',
                'invite-1',
                body
            );

            expect(result).toEqual({ data: invite });
            expect(workspaceInviteDomain.resendInvite).toHaveBeenCalledWith(
                workspace,
                'user-1',
                'invite-1',
                null
            );
        });
    });

    describe('revokeInvite', () => {
        it('revokes the invite', async () => {
            await service.revokeInvite('workspace-1', 'user-1', 'invite-1');

            expect(workspaceInviteDomain.revokeInvite).toHaveBeenCalledWith(
                'workspace-1',
                'user-1',
                'invite-1'
            );
        });
    });

    describe('claimInvite', () => {
        it('claims the invite', async () => {
            const body: WorkspaceInviteClaimRequestDto = {
                inviteToken: 'raw-token',
            };

            await service.claimInvite('user-1', 'user@example.com', body);

            expect(workspaceInviteDomain.claimInvite).toHaveBeenCalledWith(
                'user-1',
                'user@example.com',
                'raw-token'
            );
        });
    });

    describe('previewInvite', () => {
        it('maps the invite preview and wraps it in the response envelope', async () => {
            const inviter = { name: 'Jane Doe', username: 'jane' };
            workspaceInviteDomain.previewInvite.mockResolvedValue({
                workspace,
                invite,
                inviter,
            });
            const preview = {
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            };
            workspaceUtil.mapInvitePreview.mockReturnValue(preview);

            const result = await service.previewInvite('raw-token');

            expect(result).toEqual({ data: preview });
            expect(workspaceInviteDomain.previewInvite).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(workspaceUtil.mapInvitePreview).toHaveBeenCalledWith(
                workspace,
                invite,
                inviter
            );
        });
    });
});
