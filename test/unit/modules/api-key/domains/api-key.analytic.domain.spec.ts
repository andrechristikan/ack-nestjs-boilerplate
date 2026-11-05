import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';

describe('ApiKeyAnalyticDomain', () => {
    const apiKeyAnalyticRepository: MockProxy<ApiKeyAnalyticRepository> =
        mock<ApiKeyAnalyticRepository>();

    const now = new Date('2026-03-01T00:00:00.000Z');

    let domain: ApiKeyAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyAnalyticDomain,
                {
                    provide: ApiKeyAnalyticRepository,
                    useValue: apiKeyAnalyticRepository,
                },
            ],
        }).compile();

        domain = module.get(ApiKeyAnalyticDomain);
    });

    describe('getActiveExpired', () => {
        it('counts active, expired, and inactive api keys against the supplied time', async () => {
            apiKeyAnalyticRepository.countActive.mockResolvedValue(6);
            apiKeyAnalyticRepository.countExpired.mockResolvedValue(1);
            apiKeyAnalyticRepository.countInactive.mockResolvedValue(2);

            const result = await domain.getActiveExpired(now);

            expect(result).toEqual({ active: 6, expired: 1, inactive: 2 });
            expect(apiKeyAnalyticRepository.countActive).toHaveBeenCalledWith(
                now
            );
            expect(apiKeyAnalyticRepository.countExpired).toHaveBeenCalledWith(
                now
            );
            expect(
                apiKeyAnalyticRepository.countInactive
            ).toHaveBeenCalledWith();
        });
    });

    describe('getTypeMix', () => {
        it('delegates the type bucket read to the repository', async () => {
            const buckets = [{ key: EnumApiKeyType.default, count: 3 }];
            apiKeyAnalyticRepository.groupByType.mockResolvedValue(buckets);

            const result = await domain.getTypeMix();

            expect(result).toBe(buckets);
        });
    });
});
