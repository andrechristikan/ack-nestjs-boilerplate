import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticApiKeysActiveExpiredUseCase } from '@modules/analytic/use-cases/analytic.api-keys-active-expired.use-case';

describe('AnalyticApiKeysActiveExpiredUseCase', () => {
    const analyticApiKeyService: MockProxy<AnalyticApiKeyService> =
        mock<AnalyticApiKeyService>();

    let useCase: AnalyticApiKeysActiveExpiredUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeysActiveExpiredUseCase,
                {
                    provide: AnalyticApiKeyService,
                    useValue: analyticApiKeyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeysActiveExpiredUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticApiKeyService.apiKeysActiveExpired.mockResolvedValue({
                active: 6,
                expired: 1,
                inactive: 2,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { active: 6, expired: 1, inactive: 2 },
            });
            expect(
                analyticApiKeyService.apiKeysActiveExpired
            ).toHaveBeenCalledWith();
        });
    });
});
