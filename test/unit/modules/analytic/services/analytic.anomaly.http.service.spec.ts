import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticAnomalyHttpService } from '@modules/analytic/services/analytic.anomaly.http.service';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';

describe('AnalyticAnomalyHttpService', () => {
    const analyticAnomalyDomain: MockProxy<AnalyticAnomalyDomain> =
        mock<AnalyticAnomalyDomain>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
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

    let service: AnalyticAnomalyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAnomalyHttpService,
                {
                    provide: AnalyticAnomalyDomain,
                    useValue: analyticAnomalyDomain,
                },
                { provide: AnalyticDateDomain, useValue: analyticDateDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(AnalyticAnomalyHttpService);
    });

    describe('impossibleTravelSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAnomalyDomain.impossibleTravelSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
            });

            const result = await service.impossibleTravelSummary({
                startDate,
                endDate,
            });

            expect(analyticDateDomain.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
                },
            });
            expect(
                analyticAnomalyDomain.impossibleTravelSummary
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticAnomalyDomain.impossibleTravelSummary.mockResolvedValue({
                count: 0,
                window: null,
                meta: { minDistanceKm: 100, maxDeltaInMs: 600000 },
            });

            await service.impossibleTravelSummary({});

            expect(analyticDateDomain.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );

            expect(
                analyticAnomalyDomain.impossibleTravelSummary
            ).toHaveBeenCalledWith(null, null);
        });
    });

    describe('impossibleTravelList', () => {
        it('hands the optional range and pagination to the domain', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        fromSessionId: 'session-1',
                        toSessionId: 'session-2',
                        distanceKm: 800,
                        deltaMs: 1000,
                    },
                ],
            };
            analyticAnomalyDomain.impossibleTravelList.mockResolvedValue(page);

            const result = await service.impossibleTravelList({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyDomain.impossibleTravelList
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        fromSessionId: 'session-1',
                        toSessionId: 'session-2',
                        distanceKm: 800,
                        deltaMs: 1000,
                    },
                ],
            };
            analyticAnomalyDomain.impossibleTravelList.mockResolvedValue(page);

            await service.impossibleTravelList({ page: 1, perPage: 20 });

            expect(
                analyticAnomalyDomain.impossibleTravelList
            ).toHaveBeenCalledWith(null, null, pagination);
        });
    });

    describe('loginSpikeIpSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyDomain.loginSpikeIpSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.loginSpikeIpSummary({ windowMs });

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticAnomalyDomain.loginSpikeIpSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticAnomalyDomain.loginSpikeIpSummary.mockResolvedValue({
                count: 0,
                window: null,
                meta: { minUniqueAccounts: 5 },
            });

            await service.loginSpikeIpSummary({});

            expect(
                analyticAnomalyDomain.loginSpikeIpSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('loginSpikeIpList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        ipAddress: '10.0.0.1',
                        uniqueUsers: 5,
                        attempts: 9,
                    },
                ],
            };
            analyticAnomalyDomain.loginSpikeIpList.mockResolvedValue(page);

            const result = await service.loginSpikeIpList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticAnomalyDomain.loginSpikeIpList).toHaveBeenCalledWith(
                windowMs,
                pagination
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        ipAddress: '10.0.0.1',
                        uniqueUsers: 5,
                        attempts: 9,
                    },
                ],
            };
            analyticAnomalyDomain.loginSpikeIpList.mockResolvedValue(page);

            await service.loginSpikeIpList({ page: 1, perPage: 20 });

            expect(analyticAnomalyDomain.loginSpikeIpList).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });

    describe('failedLoginSpikeSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyDomain.failedLoginSpikeSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { nearLockoutMinAttempt: 4, bucketCount: 2 },
            });

            const result = await service.failedLoginSpikeSummary();

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { nearLockoutMinAttempt: 4, bucketCount: 2 },
                },
            });
            expect(
                analyticAnomalyDomain.failedLoginSpikeSummary
            ).toHaveBeenCalledWith();
        });
    });

    describe('failedLoginSpikeList', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        id: 'user-1',
                        email: 'user@example.com',
                        passwordAttempt: 4,
                        lastLoginAt: startDate,
                        createdAt: startDate,
                    },
                ],
            };
            analyticAnomalyDomain.failedLoginSpikeList.mockResolvedValue(page);

            const result = await service.failedLoginSpikeList({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyDomain.failedLoginSpikeList
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('deviceProliferationSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAnomalyDomain.deviceProliferationSummary.mockResolvedValue({
                count: 4,
                window: '1h',
                meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
            });

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual({
                data: {
                    count: 4,
                    window: '1h',
                    meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
                },
            });
            expect(
                analyticAnomalyDomain.deviceProliferationSummary
            ).toHaveBeenCalledWith();
        });
    });

    describe('deviceProliferationList', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        deviceCount: 12,
                        zScore: 3.1,
                    },
                ],
            };
            analyticAnomalyDomain.deviceProliferationList.mockResolvedValue(
                page
            );

            const result = await service.deviceProliferationList({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticAnomalyDomain.deviceProliferationList
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('loginTimeSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAnomalyDomain.loginTimeSummary.mockResolvedValue({
                count: 4,
                window: '1h',
            });

            const result = await service.loginTimeSummary({
                startDate,
                endDate,
            });

            expect(analyticDateDomain.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { count: 4, window: '1h' },
            });
            expect(analyticAnomalyDomain.loginTimeSummary).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticAnomalyDomain.loginTimeSummary.mockResolvedValue({
                count: 0,
                window: null,
            });

            await service.loginTimeSummary({});

            expect(analyticDateDomain.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );

            expect(analyticAnomalyDomain.loginTimeSummary).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('loginTimeList', () => {
        it('hands the optional range and pagination to the domain', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        lastHour: 3,
                        historicalFrequencyPercent: 2,
                    },
                ],
            };
            analyticAnomalyDomain.loginTimeList.mockResolvedValue(page);

            const result = await service.loginTimeList({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticAnomalyDomain.loginTimeList).toHaveBeenCalledWith(
                startDate,
                endDate,
                pagination
            );
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        lastHour: 3,
                        historicalFrequencyPercent: 2,
                    },
                ],
            };
            analyticAnomalyDomain.loginTimeList.mockResolvedValue(page);

            await service.loginTimeList({ page: 1, perPage: 20 });

            expect(analyticAnomalyDomain.loginTimeList).toHaveBeenCalledWith(
                null,
                null,
                pagination
            );
        });
    });
});
