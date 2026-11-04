import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { buildAnalyticSession } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticAnomalyUtil', () => {
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const tenMinutesLater = new Date('2026-01-01T00:10:00.000Z');
    const nextDay = new Date('2026-01-02T00:00:00.000Z');
    const emptyAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const nyc: GeoLocation = {
        latitude: 40.7,
        longitude: -74,
        country: 'US',
        region: 'NY',
        city: 'New York',
    };
    const london: GeoLocation = {
        latitude: 51.5,
        longitude: -0.1,
        country: 'GB',
        region: 'ENG',
        city: 'London',
    };
    const nearNyc: GeoLocation = {
        ...nyc,
        latitude: 40.8,
        longitude: -74.1,
    };

    let util: AnalyticAnomalyUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperNumberService.percent.mockImplementation((part, total) =>
            total === 0 ? 0 : (part / total) * 100
        );

        configGet.mockImplementation((key: string) =>
            key === 'app.timezone' ? 'UTC' : undefined
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAnomalyUtil,
                HelperDateService,
                { provide: ConfigService, useValue: configService },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();

        util = module.get(AnalyticAnomalyUtil);
    });

    describe('findImpossibleTravel', () => {
        it('flags consecutive sessions that travel too far too fast', () => {
            const sessions = [
                buildAnalyticSession(
                    'session-1',
                    'user-1',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'session-2',
                    'user-1',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
            ];

            const result = util.findImpossibleTravel(sessions, 500, 3600000);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                userId: 'user-1',
                fromSessionId: 'session-1',
                toSessionId: 'session-2',
                deltaMs: 600000,
            });
            expect(result[0]!.distanceKm).toBeGreaterThan(5000);
        });

        it('pairs sessions per user and never across users', () => {
            const sessions = [
                buildAnalyticSession(
                    'a1',
                    'user-a',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b1',
                    'user-b',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
            ];

            expect(util.findImpossibleTravel(sessions, 500, 3600000)).toEqual(
                []
            );
        });

        it('skips a pair when either session has no geo', () => {
            const sessions = [
                buildAnalyticSession(
                    'a1',
                    'user-a',
                    startDate,
                    null,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'a2',
                    'user-a',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b1',
                    'user-b',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b2',
                    'user-b',
                    tenMinutesLater,
                    null,
                    emptyAgent
                ),
            ];

            expect(util.findImpossibleTravel(sessions, 500, 3600000)).toEqual(
                []
            );
        });

        it('skips a pair when the distance is not above the minimum', () => {
            const sessions = [
                buildAnalyticSession(
                    'c1',
                    'user-c',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'c2',
                    'user-c',
                    tenMinutesLater,
                    nearNyc,
                    emptyAgent
                ),
            ];

            expect(util.findImpossibleTravel(sessions, 500, 3600000)).toEqual(
                []
            );
        });

        it('skips a pair when the delta is not below the maximum', () => {
            const sessions = [
                buildAnalyticSession(
                    'd1',
                    'user-d',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'd2',
                    'user-d',
                    nextDay,
                    london,
                    emptyAgent
                ),
            ];

            expect(util.findImpossibleTravel(sessions, 500, 3600000)).toEqual(
                []
            );
        });

        it('returns nothing for a single session or none', () => {
            expect(
                util.findImpossibleTravel(
                    [
                        buildAnalyticSession(
                            'solo',
                            'user-solo',
                            startDate,
                            nyc,
                            emptyAgent
                        ),
                    ],
                    500,
                    3600000
                )
            ).toEqual([]);
            expect(util.findImpossibleTravel([], 500, 3600000)).toEqual([]);
        });
    });

    describe('groupByIp', () => {
        it('merges ip and user pairs into unique users and a summed count per ip and maps a missing ip to unknown', () => {
            const pairs = [
                { ipAddress: '10.0.0.1', userId: 'user-1', count: 1 },
                { ipAddress: '10.0.0.1', userId: 'user-2', count: 2 },
                { ipAddress: null, userId: 'user-3', count: 1 },
            ];

            const result = util.groupByIp(pairs);

            expect(result.get('10.0.0.1')).toEqual({
                users: new Set(['user-1', 'user-2']),
                count: 3,
            });
            expect(result.get('unknown')).toEqual({
                users: new Set(['user-3']),
                count: 1,
            });
            expect(result.size).toBe(2);
        });

        it('returns an empty map for no pairs', () => {
            expect(util.groupByIp([]).size).toBe(0);
        });
    });

    describe('findLoginTimeAnomaly', () => {
        const eightAm = new Date('2026-01-01T08:00:00.000Z');
        const threeAm = new Date('2026-01-01T03:00:00.000Z');

        it('flags a last hour absent from the prior logins using a histogram that excludes the last login', () => {
            const logins = [
                eightAm,
                eightAm,
                eightAm,
                eightAm,
                eightAm,
                threeAm,
            ];

            const result = util.findLoginTimeAnomaly('user-1', logins, 20);

            expect(result).toEqual({
                userId: 'user-1',
                lastHour: 3,
                historicalFrequencyPercent: 0,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 5);
        });

        it('buckets logins by their hour in the configured timezone', async () => {
            configGet.mockImplementation((key: string) =>
                key === 'app.timezone' ? 'Asia/Jakarta' : undefined
            );
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    AnalyticAnomalyUtil,
                    HelperDateService,
                    { provide: ConfigService, useValue: configService },
                    {
                        provide: HelperNumberService,
                        useValue: helperNumberService,
                    },
                ],
            }).compile();
            const zonedUtil = module.get(AnalyticAnomalyUtil);
            const beforeMidnight = new Date('2026-01-01T16:00:00.000Z');
            const afterMidnight = new Date('2026-01-01T17:00:00.000Z');
            const logins = [
                beforeMidnight,
                beforeMidnight,
                beforeMidnight,
                beforeMidnight,
                afterMidnight,
            ];

            const result = zonedUtil.findLoginTimeAnomaly('user-1', logins, 20);

            expect(result).toEqual({
                userId: 'user-1',
                lastHour: 0,
                historicalFrequencyPercent: 0,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 4);
        });

        it('returns null when the last hour frequency reaches the threshold', () => {
            const logins = [eightAm, eightAm, eightAm, eightAm, eightAm];

            expect(
                util.findLoginTimeAnomaly('user-keep', logins, 20)
            ).toBeNull();
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 4);
        });
    });

    describe('distanceKm', () => {
        it('returns 0 when both points are the same', () => {
            expect(util['distanceKm'](40.7128, -74.006, 40.7128, -74.006)).toBe(
                0
            );
        });

        it('returns half the earth circumference for antipodal longitudes at the equator', () => {
            expect(util['distanceKm'](0, 0, 0, 180)).toBeCloseTo(20015.1, 1);
        });
    });
});
