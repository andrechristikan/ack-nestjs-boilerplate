import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

describe('SessionAnalyticDomain', () => {
    const now = new Date('2026-03-01T00:00:00.000Z');
    const sessionAnalyticRepository: MockProxy<SessionAnalyticRepository> =
        mock<SessionAnalyticRepository>();
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

    describe('getActiveWithGeoInRange', () => {
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

            const result = await domain.getActiveWithGeoInRange(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
        });

        it('delegates with no date range', async () => {
            sessionAnalyticRepository.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            await domain.getActiveWithGeoInRange(null, null, now);

            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(null, null, now);
        });
    });

    describe('getActiveInRange', () => {
        it('delegates to the repository without a geo filter', async () => {
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
            sessionAnalyticRepository.findActiveInRange.mockResolvedValue(rows);

            const result = await domain.getActiveInRange(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.findActiveInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
        });
    });

    describe('getCountActiveByUser', () => {
        it('delegates to the repository', async () => {
            const rows: ISessionAnalyticUserCount[] = [
                { userId: 'user-1', count: 3 },
            ];
            sessionAnalyticRepository.countActiveByUser.mockResolvedValue(rows);

            const result = await domain.getCountActiveByUser(now);

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.countActiveByUser
            ).toHaveBeenCalledWith(now);
        });
    });

    describe('getGroupByCountry', () => {
        it('delegates to the repository with the given date range', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-01-31T00:00:00.000Z');
            const buckets: IAnalyticCountBucket[] = [{ key: 'US', count: 2 }];
            sessionAnalyticRepository.groupByCountry.mockResolvedValue(buckets);

            const result = await domain.getGroupByCountry(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(buckets);
            expect(
                sessionAnalyticRepository.groupByCountry
            ).toHaveBeenCalledWith(startDate, endDate, now);
        });
    });

    describe('getCountAll', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countAll.mockResolvedValue(10);

            const result = await domain.getCountAll();

            expect(result).toBe(10);
        });
    });

    describe('getCountActive', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countActive.mockResolvedValue(4);

            const result = await domain.getCountActive(now);

            expect(result).toBe(4);
            expect(sessionAnalyticRepository.countActive).toHaveBeenCalledWith(
                now
            );
        });
    });
});
