import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticFraudSignalRows,
    IAnalyticFraudSignalUsers,
} from '@modules/analytic/interfaces/analytic.fraud.interface';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { buildAnalyticActivityLog } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticFraudUtil', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const configValues: Record<string, number> = {
        'analytic.fraud.bands.monitorMax': 10,
        'analytic.fraud.bands.reviewMax': 30,
        'analytic.fraud.bands.elevateMax': 50,
        'analytic.fraud.weights.sessionAfterAdmin': 1,
        'analytic.fraud.weights.impossibleTravel': 2,
        'analytic.fraud.weights.newDeviceAfterPasswordChange': 4,
        'analytic.fraud.weights.credentialStuffingIp': 8,
        'analytic.fraud.weights.sharedFingerprint': 16,
        'analytic.fraud.weights.nearLockout': 32,
        'analytic.fraud.weights.massRegistrationIp': 64,
        'analytic.fraud.weights.forgotPasswordAbuse': 128,
        'auth.password.maxAttempt': 5,
        'analytic.fraud.nearLockoutOffset': 1,
    };
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const emptySignals: IAnalyticFraudSignalUsers = {
        sessionAfterAdmin: new Set(),
        impossibleTravel: new Set(),
        newDeviceAfterPasswordChange: new Set(),
        credentialStuffingIp: new Set(),
        sharedFingerprint: new Set(),
        massRegistrationIp: new Set(),
        forgotPasswordAbuse: new Set(),
    };

    let util: AnalyticFraudUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(AnalyticFraudUtil);
    });

    describe('resolveBand', () => {
        it('maps a score at or below each ceiling to its band', () => {
            expect(util.resolveBand(0)).toBe(EnumAnalyticFraudBand.monitor);
            expect(util.resolveBand(10)).toBe(EnumAnalyticFraudBand.monitor);
            expect(util.resolveBand(11)).toBe(EnumAnalyticFraudBand.review);
            expect(util.resolveBand(30)).toBe(EnumAnalyticFraudBand.review);
            expect(util.resolveBand(31)).toBe(EnumAnalyticFraudBand.elevate);
            expect(util.resolveBand(50)).toBe(EnumAnalyticFraudBand.elevate);
        });

        it('maps a score above the last ceiling to critical', () => {
            expect(util.resolveBand(51)).toBe(EnumAnalyticFraudBand.critical);
        });
    });

    describe('score', () => {
        const user = {
            id: 'user-1',
            email: 'user@example.com',
            passwordAttempt: null,
        };

        it('sums the weight of every signal that hit, in signal order', () => {
            const signals: IAnalyticFraudSignalUsers = {
                sessionAfterAdmin: new Set(['user-1']),
                impossibleTravel: new Set(['user-1']),
                newDeviceAfterPasswordChange: new Set(['user-1']),
                credentialStuffingIp: new Set(['user-1']),
                sharedFingerprint: new Set(['user-1']),
                massRegistrationIp: new Set(['user-1']),
                forgotPasswordAbuse: new Set(['user-1']),
            };

            const result = util.score({ ...user, passwordAttempt: 4 }, signals);

            expect(result).toEqual({
                userId: 'user-1',
                score: 255,
                band: EnumAnalyticFraudBand.critical,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.sessionAfterAdmin,
                    EnumAnalyticFraudContributingSignal.impossibleTravel,
                    EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                    EnumAnalyticFraudContributingSignal.credentialStuffingIp,
                    EnumAnalyticFraudContributingSignal.sharedFingerprint,
                    EnumAnalyticFraudContributingSignal.nearLockout,
                    EnumAnalyticFraudContributingSignal.massRegistrationIp,
                    EnumAnalyticFraudContributingSignal.forgotPasswordAbuse,
                ],
            });
        });

        it('ignores signals that name another user', () => {
            const signals: IAnalyticFraudSignalUsers = {
                ...emptySignals,
                sharedFingerprint: new Set(['user-2']),
            };

            expect(util.score(user, signals)).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
            });
        });

        it('flags near-lockout at the password max attempt minus the offset and treats null as zero', () => {
            expect(
                util.score({ ...user, passwordAttempt: 3 }, emptySignals)
                    .contributingSignalCodes
            ).toEqual([]);
            expect(
                util.score({ ...user, passwordAttempt: 4 }, emptySignals)
                    .contributingSignalCodes
            ).toEqual([EnumAnalyticFraudContributingSignal.nearLockout]);
            expect(
                util.score(user, emptySignals).contributingSignalCodes
            ).toEqual([]);
        });
    });

    describe('nearLockoutThreshold', () => {
        it('subtracts the near-lockout offset from the max attempt', () => {
            expect(util.nearLockoutThreshold(5)).toBe(4);
            expect(util.nearLockoutThreshold(10)).toBe(9);
        });

        it('floors the threshold at one attempt', () => {
            expect(util.nearLockoutThreshold(1)).toBe(1);
            expect(util.nearLockoutThreshold(0)).toBe(1);
        });
    });

    describe('countByUser', () => {
        it('counts activity rows per user and keeps users at or above the minimum', () => {
            const logs = [
                buildAnalyticActivityLog(
                    'log-user-1',
                    'user-1',
                    null,
                    createdAt
                ),
                buildAnalyticActivityLog(
                    'log-user-1',
                    'user-1',
                    null,
                    createdAt
                ),
                buildAnalyticActivityLog(
                    'log-user-2',
                    'user-2',
                    null,
                    createdAt
                ),
            ];

            expect(util.countByUser(logs, 2)).toEqual([
                { userId: 'user-1', count: 2 },
            ]);
        });

        it('returns every user when the minimum is one and nothing for no rows', () => {
            expect(
                util.countByUser(
                    [
                        buildAnalyticActivityLog(
                            'log-user-1',
                            'user-1',
                            null,
                            createdAt
                        ),
                        buildAnalyticActivityLog(
                            'log-user-2',
                            'user-2',
                            null,
                            createdAt
                        ),
                    ],
                    1
                )
            ).toEqual([
                { userId: 'user-1', count: 1 },
                { userId: 'user-2', count: 1 },
            ]);
            expect(util.countByUser([], 1)).toEqual([]);
        });
    });

    describe('toSignalUsers', () => {
        it('turns the signal rows into one user set per signal', () => {
            const rows: IAnalyticFraudSignalRows = {
                sessionAfterAdmin: [
                    {
                        userId: 'user-1',
                        revokedAt: createdAt,
                        loginAt: createdAt,
                    },
                ],
                impossibleTravelUserIds: ['user-2'],
                accountTakeover: [
                    {
                        userId: 'user-3',
                        indicatorCodes: ['newDeviceAfterPasswordChange'],
                        passwordChangedAt: createdAt,
                    },
                ],
                credentialStuffingUserIds: new Set(['user-4']),
                sharedFingerprint: [
                    {
                        fingerprint: 'fp-1',
                        userCount: 2,
                        userIds: ['user-5', 'user-6'],
                    },
                ],
                massRegistrationUserIds: new Set(['user-7']),
                forgotPasswordAbuse: [{ userId: 'user-8', tokenCount: 2 }],
            };

            expect(util.toSignalUsers(rows)).toEqual({
                sessionAfterAdmin: new Set(['user-1']),
                impossibleTravel: new Set(['user-2']),
                newDeviceAfterPasswordChange: new Set(['user-3']),
                credentialStuffingIp: new Set(['user-4']),
                sharedFingerprint: new Set(['user-5', 'user-6']),
                massRegistrationIp: new Set(['user-7']),
                forgotPasswordAbuse: new Set(['user-8']),
            });
        });
    });

    describe('collectCandidateIds', () => {
        const nearLockout = [
            {
                id: 'user-9',
                email: 'user@example.com',
                passwordAttempt: 4,
                lastLoginAt: null,
                createdAt,
            },
            {
                id: 'user-1',
                email: 'user1@example.com',
                passwordAttempt: 4,
                lastLoginAt: null,
                createdAt,
            },
        ];

        it('unions every signal set with the near-lockout users without duplicates', () => {
            const signals: IAnalyticFraudSignalUsers = {
                ...emptySignals,
                sessionAfterAdmin: new Set(['user-1']),
                forgotPasswordAbuse: new Set(['user-2', 'user-1']),
            };

            expect(util.collectCandidateIds(signals, nearLockout, 10)).toEqual([
                'user-1',
                'user-9',
                'user-2',
            ]);
        });

        it('caps the union at the limit', () => {
            const signals: IAnalyticFraudSignalUsers = {
                ...emptySignals,
                sessionAfterAdmin: new Set(['user-1', 'user-2']),
                impossibleTravel: new Set(['user-3']),
            };

            expect(util.collectCandidateIds(signals, nearLockout, 2)).toEqual([
                'user-1',
                'user-2',
            ]);
        });
    });
});
