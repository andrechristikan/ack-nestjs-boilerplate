import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogGetListOffsetByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-user.use-case';

describe('ActivityLogGetListOffsetByUserUseCase', () => {
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
    const offsetQuery: ActivityLogAdminListRequestDto = {};
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 0,
        perPage: 20,
        hasNext: false,
        hasPrevious: false,
        page: 1,
        totalPage: 1,
        data: [],
    };

    let useCase: ActivityLogGetListOffsetByUserUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogGetListOffsetByUserUseCase,
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

        useCase = module.get(ActivityLogGetListOffsetByUserUseCase);
    });

    describe('execute', () => {
        it('resolves offset pagination and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            activityLogService.getListOffsetByUser.mockResolvedValue(
                offsetPage
            );

            const result = await useCase.execute('user-1', offsetQuery);

            expect(result).toEqual(offsetPage);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                offsetQuery,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(activityLogService.getListOffsetByUser).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });
});
