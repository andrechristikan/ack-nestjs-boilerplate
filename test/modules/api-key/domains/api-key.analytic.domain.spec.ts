import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';

describe('ApiKeyAnalyticDomain', () => {
    const apiKeyAnalyticRepository: MockProxy<ApiKeyAnalyticRepository> =
        mock<ApiKeyAnalyticRepository>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();

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
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(ApiKeyAnalyticDomain);
    });

    describe('lifecycle', () => {
        it('counts create, reset, updated, and deleted actions in the range', async () => {
            activityLogAnalyticDomain.countByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(4);

            const result = await domain.lifecycle(startDate, endDate);

            expect(result).toEqual({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.adminApiKeyCreate],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.adminApiKeyReset],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                3,
                [
                    EnumActivityLogAction.adminApiKeyUpdate,
                    EnumActivityLogAction.adminApiKeyUpdateDate,
                    EnumActivityLogAction.adminApiKeyUpdateStatus,
                ],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.countByActionsInRange
            ).toHaveBeenNthCalledWith(
                4,
                [EnumActivityLogAction.adminApiKeyDelete],
                startDate,
                endDate
            );
        });
    });

    describe('activeExpired', () => {
        it('counts active and expired api keys', async () => {
            apiKeyAnalyticRepository.countActive.mockResolvedValue(6);
            apiKeyAnalyticRepository.countExpired.mockResolvedValue(1);

            const result = await domain.activeExpired();

            expect(result).toEqual({ active: 6, expired: 1 });
        });
    });

    describe('typeMix', () => {
        it('delegates the type bucket read to the repository', async () => {
            const buckets = [{ key: EnumApiKeyType.default, count: 3 }];
            apiKeyAnalyticRepository.groupByType.mockResolvedValue(buckets);

            const result = await domain.typeMix();

            expect(result).toBe(buckets);
        });
    });

    describe('findCreatedInRange', () => {
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

            const result = await domain.findCreatedInRange(startDate, endDate);

            expect(result).toBe(rows);
            expect(
                apiKeyAnalyticRepository.findCreatedInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });
});
