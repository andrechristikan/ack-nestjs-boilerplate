import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { AnalyticCountOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticProjectService } from '@modules/analytic/services/analytic.project.service';
import { AnalyticProjectsMembershipListUseCase } from '@modules/analytic/use-cases/analytic.projects-membership-list.use-case';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticProjectsMembershipListUseCase', () => {
    const analyticProjectService: MockProxy<AnalyticProjectService> =
        mock<AnalyticProjectService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let useCase: AnalyticProjectsMembershipListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticProjectsMembershipListUseCase,
                {
                    provide: AnalyticProjectService,
                    useValue: analyticProjectService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticProjectsMembershipListUseCase);
    });

    describe('execute', () => {
        it('returns the domain page unchanged', async () => {
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ projectId: 'project-1', count: 4 }],
            };
            analyticProjectService.projectsMembership.mockResolvedValue(page);

            const result = await useCase.execute({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),

                {
                    orderBy: AnalyticCountOrderBy,
                    defaultOrderBy: EnumAnalyticCountOrderBy.mostCount,
                }
            );
            expect(
                analyticProjectService.projectsMembership
            ).toHaveBeenCalledWith(pagination);
        });
    });
});
