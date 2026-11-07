import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    ActivityLogDefaultAvailableOrderBy,
    ActivityLogSharedUserListCursorScope,
} from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogGetListCursorByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-user.use-case';

describe('ActivityLogGetListCursorByUserUseCase', () => {
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

    let useCase: ActivityLogGetListCursorByUserUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListCursorByUserUseCase,
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

        useCase = module.get(ActivityLogGetListCursorByUserUseCase);
    });

    describe('execute', () => {
        it('resolves cursor pagination and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            activityLogService.getListCursorByUser.mockResolvedValue(
                cursorPage
            );

            const result = await useCase.execute('user-1', cursorQuery);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(
                cursorQuery,
                {
                    scope: ActivityLogSharedUserListCursorScope,
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(activityLogService.getListCursorByUser).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });
});
