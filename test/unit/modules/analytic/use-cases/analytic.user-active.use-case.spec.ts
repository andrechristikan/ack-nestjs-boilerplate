import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticUserActiveUseCase } from '@modules/analytic/use-cases/analytic.user-active.use-case';

describe('AnalyticUserActiveUseCase', () => {
    const analyticUserService: MockProxy<AnalyticUserService> =
        mock<AnalyticUserService>();

    let useCase: AnalyticUserActiveUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUserActiveUseCase,
                { provide: AnalyticUserService, useValue: analyticUserService },
            ],
        }).compile();

        useCase = module.get(AnalyticUserActiveUseCase);
    });

    describe('execute', () => {
        it('wraps the active user counts in the response envelope', async () => {
            const data = {
                daily: 2,
                weekly: 5,
                monthly: 9,
                windowEnd: new Date('2026-11-19T10:00:00.000Z'),
                computedAt: null,
            };
            analyticUserService.getUserActive.mockResolvedValue(data);

            const result = await useCase.execute();

            expect(result).toEqual({ data });
            expect(analyticUserService.getUserActive).toHaveBeenCalledWith();
        });
    });
});
