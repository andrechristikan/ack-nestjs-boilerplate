import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticBackupCodeNewDeviceAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticBackupCodeNewDeviceListUseCase } from '@modules/analytic/use-cases/analytic.backup-code-new-device-list.use-case';

describe('AnalyticBackupCodeNewDeviceListUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const windowMs: number = 3600000;

    const pagination: IPaginationQueryOffsetParams<unknown> = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
    };

    let useCase: AnalyticBackupCodeNewDeviceListUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticBackupCodeNewDeviceListUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(AnalyticBackupCodeNewDeviceListUseCase);
    });

    describe('execute', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', regeneratedAt: startDate }],
            };
            analyticFraudService.backupCodeNewDeviceList.mockResolvedValue(
                page
            );

            const result = await useCase.execute({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudService.backupCodeNewDeviceList
            ).toHaveBeenCalledWith(windowMs, pagination);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(
                expect.anything(),
                {
                    availableOrderBy:
                        AnalyticBackupCodeNewDeviceAvailableOrderBy,
                }
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudService.backupCodeNewDeviceList.mockResolvedValue(
                page
            );

            await useCase.execute({ page: 1, perPage: 20 });

            expect(
                analyticFraudService.backupCodeNewDeviceList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });
});
