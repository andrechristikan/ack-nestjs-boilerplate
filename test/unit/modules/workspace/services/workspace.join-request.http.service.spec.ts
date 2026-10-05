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
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceJoinRequestHttpService } from '@modules/workspace/services/workspace.join-request.http.service';

describe('WorkspaceJoinRequestHttpService', () => {
    const workspaceJoinRequestDomain: MockProxy<WorkspaceJoinRequestDomain> =
        mock<WorkspaceJoinRequestDomain>();
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
        isPublic: true,
    };

    const joinRequest: WorkspaceJoinRequest = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-2',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-2',
        workspaceId: 'workspace-1',
        userId: 'user-2',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
    };

    const cursorPagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput> =
        { limit: 20, orderBy: [] };

    let service: WorkspaceJoinRequestHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceJoinRequestHttpService,
                {
                    provide: WorkspaceJoinRequestDomain,
                    useValue: workspaceJoinRequestDomain,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestHttpService);
    });

    describe('createJoinRequest', () => {
        it('creates the join request and wraps it in the response envelope', async () => {
            const body: WorkspaceJoinRequestCreateRequestDto = {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            };
            workspaceJoinRequestDomain.createJoinRequest.mockResolvedValue(
                joinRequest
            );

            const result = await service.createJoinRequest('user-2', body);

            expect(result).toEqual({ data: joinRequest });
            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).toHaveBeenCalledWith('user-2', {
                workspaceId: 'workspace-1',
                message: 'Please let me in',
            });
        });
    });

    describe('getJoinRequestsList', () => {
        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceJoinRequestListRequestDto = {
                status: 'pending',
            };
            const statusFilter = {
                where: {
                    status: { in: [EnumWorkspaceJoinRequestStatus.pending] },
                },
                storeFilter: {
                    status: [EnumWorkspaceJoinRequestStatus.pending],
                },
            };
            paginationQueryUtil.inEnum.mockReturnValue(statusFilter);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                page
            );

            await service.getJoinRequestsList('workspace-1', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceJoinRequestDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.WorkspaceJoinRequestScalarFieldEnum.status,
                'pending',
                WorkspaceJoinRequestDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        status: [EnumWorkspaceJoinRequestStatus.pending],
                    },
                }
            );
            expect(
                workspaceJoinRequestDomain.getJoinRequestsList
            ).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                statusFilter.where
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                page
            );

            await service.getJoinRequestsList('workspace-1', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
        });
    });

    describe('acceptJoinRequest', () => {
        it('accepts the join request', async () => {
            await service.acceptJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1'
            );

            expect(
                workspaceJoinRequestDomain.acceptJoinRequest
            ).toHaveBeenCalledWith(workspace, 'reviewer-1', 'join-request-1');
        });
    });

    describe('rejectJoinRequest', () => {
        it('rejects the join request', async () => {
            const body: WorkspaceJoinRequestRejectRequestDto = {
                rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
            };

            await service.rejectJoinRequest(
                workspace,
                'reviewer-1',
                'join-request-1',
                body
            );

            expect(
                workspaceJoinRequestDomain.rejectJoinRequest
            ).toHaveBeenCalledWith(
                workspace,
                'reviewer-1',
                'join-request-1',
                EnumWorkspaceJoinRejectReason.wrongWorkspace
            );
        });
    });
});
