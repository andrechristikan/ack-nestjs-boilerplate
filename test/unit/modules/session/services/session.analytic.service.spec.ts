import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Duration } from 'luxon';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

describe('SessionAnalyticService', () => {
    const now = new Date('2026-03-01T00:00:00.000Z');
    const sessionAnalyticRepository: MockProxy<SessionAnalyticRepository> =
        mock<SessionAnalyticRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const idleTimeoutInMs = 604800000;
    const idleDuration = Duration.fromObject({ milliseconds: idleTimeoutInMs });
    const idleSince = new Date('2026-02-22T00:00:00.000Z');
    let service: SessionAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(idleTimeoutInMs);
        helperDateService.backward.mockReturnValue(idleSince);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionAnalyticService,
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: SessionAnalyticRepository,
                    useValue: sessionAnalyticRepository,
                },
            ],
        }).compile();
        service = module.get(SessionAnalyticService);
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

            const result = await service.getActiveWithGeoInRange(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now, idleSince);
        });

        it('delegates with no date range', async () => {
            sessionAnalyticRepository.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            await service.getActiveWithGeoInRange(null, null, now);

            expect(
                sessionAnalyticRepository.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(null, null, now, idleSince);
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

            const result = await service.getActiveInRange(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.findActiveInRange
            ).toHaveBeenCalledWith(startDate, endDate, now, idleSince);
        });
    });

    describe('getCountActiveByUser', () => {
        it('delegates to the repository', async () => {
            const rows: ISessionAnalyticUserCount[] = [
                { userId: 'user-1', count: 3 },
            ];
            sessionAnalyticRepository.countActiveByUser.mockResolvedValue(rows);

            const result = await service.getCountActiveByUser(now);

            expect(result).toBe(rows);
            expect(
                sessionAnalyticRepository.countActiveByUser
            ).toHaveBeenCalledWith(now, idleSince);
        });
    });

    describe('getGroupByCountry', () => {
        it('delegates to the repository with the given date range', async () => {
            const startDate = new Date('2026-01-01T00:00:00.000Z');
            const endDate = new Date('2026-01-31T00:00:00.000Z');
            const buckets: IAnalyticCountBucket[] = [{ key: 'US', count: 2 }];
            sessionAnalyticRepository.groupByCountry.mockResolvedValue(buckets);

            const result = await service.getGroupByCountry(
                startDate,
                endDate,
                now
            );

            expect(result).toBe(buckets);
            expect(
                sessionAnalyticRepository.groupByCountry
            ).toHaveBeenCalledWith(startDate, endDate, now, idleSince);
        });
    });

    describe('getCountAll', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countAll.mockResolvedValue(10);

            const result = await service.getCountAll();

            expect(result).toBe(10);
        });
    });

    describe('getCountActive', () => {
        it('delegates to the repository', async () => {
            sessionAnalyticRepository.countActive.mockResolvedValue(4);

            const result = await service.getCountActive(now);

            expect(result).toBe(4);
            expect(sessionAnalyticRepository.countActive).toHaveBeenCalledWith(
                now,
                idleSince
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                idleDuration
            );
        });
    });
});
