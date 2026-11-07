import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    ActivityLogDefaultAvailableOrderBy,
    ActivityLogSharedWorkspaceListCursorScope,
} from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogGetListCursorByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-workspace.use-case';

describe('ActivityLogGetListCursorByWorkspaceUseCase', () => {
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params = {
        skip: 0,
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const storePatch = { perPage: 20 };
    const cursorQuery: ActivityLogSharedListRequestDto = {};
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [],
    };

    let useCase: ActivityLogGetListCursorByWorkspaceUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListCursorByWorkspaceUseCase,
                { provide: ActivityLogService, useValue: activityLogService },
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

        useCase = module.get(ActivityLogGetListCursorByWorkspaceUseCase);
    });

    describe('execute', () => {
        it('resolves cursor pagination and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogService.getListCursorByWorkspace.mockResolvedValue(
                cursorPage
            );

            const result = await useCase.execute(
                'workspace-1',
                null,
                cursorQuery
            );

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(
                cursorQuery,
                {
                    scope: ActivityLogSharedWorkspaceListCursorScope,
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
            expect(
                activityLogService.getListCursorByWorkspace
            ).toHaveBeenCalledWith('workspace-1', null, params);
        });
    });
});
