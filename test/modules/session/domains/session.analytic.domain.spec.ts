import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

describe('SessionAnalyticDomain', () => {
    const sessionAnalyticRepository = mock<SessionAnalyticRepository>();
    let domain: SessionAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionAnalyticDomain,
                {
                    provide: SessionAnalyticRepository,
                    useValue: sessionAnalyticRepository,
                },
            ],
        }).compile();
        domain = module.get(SessionAnalyticDomain);
    });

    describe('findActiveWithGeoInRange', () => {
        it('delegates to the repository with the given date range', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-01-31T00:00:00.000Z');
            const rows: ISessionAnalyticSession[] = [
                {
                    id: 'session-1',
                    userId: 'user-1',
                    ipAddress: '127.0.0.1',
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: {
                        ua: null,
                        browser: null,
                        cpu: null,
                        device: null,
                        engine: null,
                        os: null,
                    },
                },
            ];
            sessionAnalyticRepository.findActiveWithGeoInRange.mockResolvedValue(
                rows
            );

            const result = await domain.findActiveWithGeoInRange(
                startDate,
                endDate
            );

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('delegates with no date range', async () => {
            sessionAnalyticRepository.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            await domain.findActiveWithGeoInRange();

            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('countActiveByUser', () => {
        it('delegates to the repository', async () => {
            const rows: ISessionAnalyticUserCount[] = [
                { userId: 'user-1', count: 3 },
            ];
            sessionAnalyticRepository.countActiveByUser.mockResolvedValue(rows);

            const result = await domain.countActiveByUser();

            expect(result).toBe(rows);
        });
    });

    describe('groupByCountry', () => {
        it('delegates to the repository with the given date range', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-01-31T00:00:00.000Z');
            const buckets: IAnalyticCountBucket[] = [{ key: 'US', count: 2 }];
            sessionAnalyticRepository.groupByCountry.mockResolvedValue(buckets);

            const result = await domain.groupByCountry(startDate, endDate);

            expect(result).toBe(buckets);
            expect(
                sessionAnalyticRepository.groupByCountry
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('countAll', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countAll.mockResolvedValue(10);

            const result = await domain.countAll();

            expect(result).toBe(10);
        });
    });

    describe('countActive', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countActive.mockResolvedValue(4);

            const result = await domain.countActive();

            expect(result).toBe(4);
        });
    });
});
