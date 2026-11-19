import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticApiKeysTypeMixUseCase } from '@modules/analytic/use-cases/analytic.api-keys-type-mix.use-case';

describe('AnalyticApiKeysTypeMixUseCase', () => {
    const analyticApiKeyService: MockProxy<AnalyticApiKeyService> =
        mock<AnalyticApiKeyService>();

    let useCase: AnalyticApiKeysTypeMixUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeysTypeMixUseCase,
                {
                    provide: AnalyticApiKeyService,
                    useValue: analyticApiKeyService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticApiKeysTypeMixUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticApiKeyService.apiKeysTypeMix.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(analyticApiKeyService.apiKeysTypeMix).toHaveBeenCalledWith();
        });
    });
});
