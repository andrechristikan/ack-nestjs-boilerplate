import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
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
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: true,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;
    const joinRequest = {
        id: 'join-request-id',
        workspaceId: 'workspace-id',
        userId: 'user-id',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt: now,
        createdBy: 'user-id',
        updatedAt: now,
        updatedBy: 'user-id',
    } satisfies WorkspaceJoinRequest;
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [joinRequest],
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
        availableSearch: [],
        availableOrderBy: ['createdAt'],
    };

    let service: WorkspaceJoinRequestHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

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
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(WorkspaceJoinRequestHttpService);
    });

    describe('createJoinRequest', () => {
        it('delegates to the domain and wraps the created join request', async () => {
            const dto = {
                workspaceId: 'workspace-id',
                message: 'please let me in',
            } satisfies WorkspaceJoinRequestCreateRequestDto;
            workspaceJoinRequestDomain.createJoinRequest.mockResolvedValue(
                joinRequest
            );

            const result = await service.createJoinRequest('user-id', dto);

            expect(result).toEqual({ data: joinRequest });
            expect(
                workspaceJoinRequestDomain.createJoinRequest
            ).toHaveBeenCalledWith('user-id', {
                workspaceId: dto.workspaceId,
                message: dto.message,
            });
        });
    });

    describe('getJoinRequestsList', () => {
        it('merges the status filter into the store patch when a status is provided', async () => {
            const query = {
                status: 'pending',
            } satisfies WorkspaceJoinRequestListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: ['pending'] } },
                storeFilter: { status: ['pending'] },
            } as never);
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                cursorPage
            );

            const result = await service.getJoinRequestsList(
                'workspace-id',
                query
            );

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: { status: ['pending'] },
                }
            );
            expect(
                workspaceJoinRequestDomain.getJoinRequestsList
            ).toHaveBeenCalledWith('workspace-id', cursorParams, {
                status: { in: ['pending'] },
            });
            expect(result).toEqual(cursorPage);
        });

        it('merges an empty filter set when no status is provided', async () => {
            const query = {} satisfies WorkspaceJoinRequestListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            workspaceJoinRequestDomain.getJoinRequestsList.mockResolvedValue(
                cursorPage
            );

            await service.getJoinRequestsList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: {},
                }
            );
            expect(
                workspaceJoinRequestDomain.getJoinRequestsList
            ).toHaveBeenCalledWith('workspace-id', cursorParams, undefined);
        });
    });

    describe('acceptJoinRequest', () => {
        it('delegates to the domain', async () => {
            await service.acceptJoinRequest(
                workspace,
                'reviewer-id',
                'join-request-id'
            );

            expect(
                workspaceJoinRequestDomain.acceptJoinRequest
            ).toHaveBeenCalledWith(workspace, 'reviewer-id', 'join-request-id');
        });
    });

    describe('rejectJoinRequest', () => {
        it('delegates to the domain with the reject reason', async () => {
            const dto = {
                rejectReasonCode: EnumWorkspaceJoinRejectReason.other,
            } satisfies WorkspaceJoinRequestRejectRequestDto;

            await service.rejectJoinRequest(
                workspace,
                'reviewer-id',
                'join-request-id',
                dto
            );

            expect(
                workspaceJoinRequestDomain.rejectJoinRequest
            ).toHaveBeenCalledWith(
                workspace,
                'reviewer-id',
                'join-request-id',
                EnumWorkspaceJoinRejectReason.other
            );
        });
    });
});
