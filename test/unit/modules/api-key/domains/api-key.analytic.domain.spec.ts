import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';

describe('ApiKeyAnalyticDomain', () => {
    const apiKeyAnalyticRepository: MockProxy<ApiKeyAnalyticRepository> =
        mock<ApiKeyAnalyticRepository>();

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

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
        it('counts active and expired api keys', async () => {
            apiKeyAnalyticRepository.countActive.mockResolvedValue(6);
            apiKeyAnalyticRepository.countExpired.mockResolvedValue(1);

            const result = await domain.getActiveExpired();

            expect(result).toEqual({ active: 6, expired: 1 });
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

    describe('getCreatedInRange', () => {
        it('delegates the created-in-range read to the repository', async () => {
            const rows: IApiKeyAnalyticCreated[] = [
                {
                    id: 'api-key-1',
                    type: EnumApiKeyType.default,
                    createdAt: startDate,
                    createdBy: 'user-1',
                },
            ];
            apiKeyAnalyticRepository.findCreatedInRange.mockResolvedValue(rows);

            const result = await domain.getCreatedInRange(startDate, endDate);

            expect(result).toBe(rows);
            expect(
                apiKeyAnalyticRepository.findCreatedInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });
});
