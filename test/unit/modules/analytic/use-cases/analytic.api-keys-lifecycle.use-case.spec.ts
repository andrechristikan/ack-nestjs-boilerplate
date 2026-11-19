import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticApiKeysLifecycleUseCase } from '@modules/analytic/use-cases/analytic.api-keys-lifecycle.use-case';

describe('AnalyticApiKeysLifecycleUseCase', () => {
    const analyticApiKeyService: MockProxy<AnalyticApiKeyService> =
        mock<AnalyticApiKeyService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticApiKeysLifecycleUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeysLifecycleUseCase,
                {
                    provide: AnalyticApiKeyService,
                    useValue: analyticApiKeyService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeysLifecycleUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticApiKeyService.apiKeysLifecycle.mockResolvedValue({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: { created: 1, reset: 2, updated: 3, deleted: 4 },
            });
            expect(analyticApiKeyService.apiKeysLifecycle).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticApiKeyService.apiKeysLifecycle.mockResolvedValue({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
