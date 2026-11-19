import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticAuthConcurrentSessionsUseCase } from '@modules/analytic/use-cases/analytic.auth-concurrent-sessions.use-case';

describe('AnalyticAuthConcurrentSessionsUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    let useCase: AnalyticAuthConcurrentSessionsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthConcurrentSessionsUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthConcurrentSessionsUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAuthService.authConcurrentSessions.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
                computedAt: null,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    buckets: [{ key: 'key-1', count: 7 }],
                    computedAt: null,
                },
            });
            expect(
                analyticAuthService.authConcurrentSessions
            ).toHaveBeenCalledWith();
        });
    });
});
