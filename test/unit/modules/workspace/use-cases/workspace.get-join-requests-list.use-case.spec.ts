import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumWorkspaceJoinRequestStatus } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { WorkspaceJoinRequestOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceGetJoinRequestsListUseCase } from '@modules/workspace/use-cases/workspace.get-join-requests-list.use-case';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumWorkspaceJoinRequestOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceGetJoinRequestsListUseCase', () => {
    const workspaceJoinRequestService: MockProxy<WorkspaceJoinRequestService> =
        mock<WorkspaceJoinRequestService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorPagination: IPaginationQueryCursorParams = {
        fingerprint: '73b86d8686dd71dd',
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1')
    );
    let useCase: WorkspaceGetJoinRequestsListUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetJoinRequestsListUseCase,
                {
                    provide: WorkspaceJoinRequestService,
                    useValue: workspaceJoinRequestService,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetJoinRequestsListUseCase);
    });

    describe('execute', () => {
        it('runs the join-request gate first and stops when it rejects', async () => {
            workspaceJoinRequestService.assertJoinRequestAllowed.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute(workspaceContext, {})
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(requestStoreService.merge).not.toHaveBeenCalled();
            expect(
                workspaceJoinRequestService.getJoinRequestsList
            ).not.toHaveBeenCalled();
        });

        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceJoinRequestListRequestDto = {
                status: 'pending',
            };
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestService.getJoinRequestsList.mockResolvedValue(
                page
            );

            await useCase.execute(workspaceContext, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumWorkspaceJoinRequestOrderBy.latest,
                    availableSearch: [],
                    availableOrderBy: Object.keys(WorkspaceJoinRequestOrderBy),
                    filters: {
                        status: [EnumWorkspaceJoinRequestStatus.pending],
                    },
                }
            );
            expect(
                workspaceJoinRequestService.getJoinRequestsList
            ).toHaveBeenCalledWith('workspace-1', cursorPagination, {
                status: { in: [EnumWorkspaceJoinRequestStatus.pending] },
            });
        });

        it('merges an empty filter set when status is absent', async () => {
            const page: IResponsePaginationReturn<WorkspaceJoinRequest> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceJoinRequestService.getJoinRequestsList.mockResolvedValue(
                page
            );

            await useCase.execute(workspaceContext, {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumWorkspaceJoinRequestOrderBy.latest,
                    availableSearch: [],
                    availableOrderBy: Object.keys(WorkspaceJoinRequestOrderBy),
                    filters: {},
                }
            );
        });
    });
});
