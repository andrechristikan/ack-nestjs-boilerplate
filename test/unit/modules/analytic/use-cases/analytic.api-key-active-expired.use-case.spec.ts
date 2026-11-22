import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticApiKeyActiveExpiredUseCase } from '@modules/analytic/use-cases/analytic.api-key-active-expired.use-case';

describe('AnalyticApiKeyActiveExpiredUseCase', () => {
    const analyticApiKeyService: MockProxy<AnalyticApiKeyService> =
        mock<AnalyticApiKeyService>();

    let useCase: AnalyticApiKeyActiveExpiredUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeyActiveExpiredUseCase,
                {
                    provide: AnalyticApiKeyService,
                    useValue: analyticApiKeyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeyActiveExpiredUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticApiKeyService.getApiKeyActiveExpired.mockResolvedValue({
                active: 6,
                expired: 1,
                inactive: 2,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { active: 6, expired: 1, inactive: 2 },
            });
            expect(
                analyticApiKeyService.getApiKeyActiveExpired
            ).toHaveBeenCalledWith();
        });
    });
});
