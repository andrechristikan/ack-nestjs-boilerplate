import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { AnalyticCountOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticWorkspacesActivityVolumeListUseCase } from '@modules/analytic/use-cases/analytic.workspaces-activity-volume-list.use-case';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticWorkspacesActivityVolumeListUseCase', () => {
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    const pagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let useCase: AnalyticWorkspacesActivityVolumeListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspacesActivityVolumeListUseCase,
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticWorkspacesActivityVolumeListUseCase);
    });

    describe('execute', () => {
        it('returns the domain page unchanged', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ workspaceId: 'workspace-1', count: 3 }],
            };
            analyticWorkspaceService.workspacesActivityVolume.mockResolvedValue(
                page
            );

            const result = await useCase.execute({
                startDate,
                endDate,
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
                analyticWorkspaceService.workspacesActivityVolume
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });
    });
});
