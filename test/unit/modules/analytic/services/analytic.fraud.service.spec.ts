import { CacheService } from '@common/cache/services/cache.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticFraudCredentialStuffingSummaryCacheSchema,
    AnalyticFraudSummaryCacheSchema,
    AnalyticRiskScoreSnapshotDataSchema,
    AnalyticSharedFingerprintSnapshotDataSchema,
    AnalyticSnapshotNullMetaSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { AnalyticFraudRepository } from '@modules/analytic/repositories/analytic.fraud.repository';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('AnalyticFraudService', () => {
    const liveSummaryTtlInMs = 60000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        liveSummaryTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticFraudUtil: MockProxy<AnalyticFraudUtil> =
        mock<AnalyticFraudUtil>();
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const analyticFraudRepository: MockProxy<AnalyticFraudRepository> =
        mock<AnalyticFraudRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const pagination = { skip: 0, limit: 20, orderBy: [] };
    const orderBy: IPaginationOrderBy[] = [
        { userId: EnumPaginationOrderDirectionType.asc },
    ];
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 0,
        perPage: 20,
        page: 1,
        totalPage: 0,
        hasNext: false,
        hasPrevious: false,
        data: [],
    };

    const onRequestWindow = {
        windowStart: startDate,
        windowEnd: now,
        computedAt: null,
    };

    const computedAt: Date = new Date('2026-03-01T00:15:00.000Z');

    const configValues: Record<string, number | string> = {
        'analytic.fraud.credentialStuffing.windowInMs': 86400000,
        'analytic.fraud.credentialStuffing.minUniqueAccounts': 2,
        'analytic.fraud.accountTakeover.newDeviceAfterPasswordChangeInMs': 3600000,
        'analytic.fraud.massRegistration.windowInMs': 86400000,
        'analytic.fraud.massRegistration.minAccountsPerIp': 2,
        'analytic.fraud.passwordResetEnumeration.windowInMs': 86400000,
        'analytic.fraud.passwordResetEnumeration.minRequestsPerIp': 2,
        'analytic.fraud.sharedFingerprint.minUsersPerFingerprint': 2,
        'analytic.fraud.sessionAfterAdmin.sessionAfterAdminRevokeInMs': 3600000,
        'analytic.fraud.forgotPasswordTokenAbuse.windowInMs': 86400000,
        'analytic.fraud.forgotPasswordTokenAbuse.minUnusedTokens': 2,
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
        'analytic.fraud.riskScore.lookbackInMs': 3600000,
        'analytic.anomaly.impossibleTravel.minDistanceKm': 500,
        'analytic.anomaly.impossibleTravel.maxDeltaInMs': 1800000,
    };

    let service: AnalyticFraudService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => configValues[key]);
        analyticCache.buildFraudSummaryKey.mockImplementation(
            (signal, window) => `${signal}:${window}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
        analyticDateUtil.windowToken.mockReturnValue('window-token');
        analyticDateUtil.windowRange.mockReturnValue({
            startDate,
            endDate: now,
        });
        featureFlagService.getMetadataNumber.mockResolvedValue(5);
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticFraudUtil, useValue: analyticFraudUtil },
                { provide: ConfigService, useValue: configService },
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
                {
                    provide: AnalyticFraudRepository,
                    useValue: analyticFraudRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticFraudService);
    });

    describe('credentialStuffingSummary', () => {
        it('reads through with the credential-stuffing key, the metadata cache schema, and the fraud summary TTL', async () => {
            const cached = {
                count: 4,
                ...onRequestWindow,
                metadata: { minUniqueAccounts: 2 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.credentialStuffingSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'credential-stuffing:86400000',
                AnalyticFraudCredentialStuffingSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and minimum on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countCredentialStuffing.mockResolvedValue(
                4
            );

            const result = await service.credentialStuffingSummary();

            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.countCredentialStuffing
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countCredentialStuffing
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2);
            expect(result).toEqual({
                count: 4,
                ...onRequestWindow,
                metadata: { minUniqueAccounts: 2 },
            });
        });
    });

    describe('credentialStuffingList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findCredentialStuffingOffset.mockResolvedValue(
                page
            );

            const result = await service.credentialStuffingList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.findCredentialStuffingOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findCredentialStuffingOffset
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2, pagination);
        });
    });

    describe('accountTakeoverSummary', () => {
        it('reads through with the account-takeover key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, ...onRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.accountTakeoverSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.accountTakeover,
                '3600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'account-takeover:3600000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countAccountTakeover.mockResolvedValue(3);

            const result = await service.accountTakeoverSummary();

            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticFraudRepository.countAccountTakeover
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countAccountTakeover
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 3600000);
            expect(result).toEqual({ count: 3, ...onRequestWindow });
        });
    });

    describe('accountTakeoverList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findAccountTakeoverOffset.mockResolvedValue(
                page
            );

            const result = await service.accountTakeoverList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticFraudRepository.findAccountTakeoverOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findAccountTakeoverOffset
            ).toHaveBeenCalledWith(
                { startDate, endDate: now },
                3600000,
                pagination
            );
        });
    });

    describe('sessionAfterAdminSummary', () => {
        it('reads through with the session-after-admin key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, ...onRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.sessionAfterAdminSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.sessionAfterAdmin,
                '3600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'session-after-admin:3600000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countSessionAfterAdmin.mockResolvedValue(3);

            const result = await service.sessionAfterAdminSummary();

            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticFraudRepository.countSessionAfterAdmin
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countSessionAfterAdmin
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 3600000);
            expect(result).toEqual({ count: 3, ...onRequestWindow });
        });
    });

    describe('sessionAfterAdminList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findSessionAfterAdminOffset.mockResolvedValue(
                page
            );

            const result = await service.sessionAfterAdminList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticFraudRepository.findSessionAfterAdminOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findSessionAfterAdminOffset
            ).toHaveBeenCalledWith(
                { startDate, endDate: now },
                3600000,
                pagination
            );
        });
    });

    describe('massRegistrationSummary', () => {
        it('reads through with the mass-registration key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...onRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.massRegistrationSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'mass-registration:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countMassRegistration.mockResolvedValue(3);

            const result = await service.massRegistrationSummary();
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.countMassRegistration
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countMassRegistration
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2);
            expect(result).toEqual({ count: 3, ...onRequestWindow });
        });
    });

    describe('massRegistrationList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findMassRegistrationOffset.mockResolvedValue(
                page
            );

            const result = await service.massRegistrationList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.findMassRegistrationOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findMassRegistrationOffset
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2, pagination);
        });
    });

    describe('passwordResetEnumerationSummary', () => {
        it('reads through with the password-reset-enumeration key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...onRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.passwordResetEnumerationSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.passwordResetEnumeration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'password-reset-enumeration:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countPasswordResetEnumeration.mockResolvedValue(
                3
            );

            const result = await service.passwordResetEnumerationSummary();
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.countPasswordResetEnumeration
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countPasswordResetEnumeration
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2);
            expect(result).toEqual({ count: 3, ...onRequestWindow });
        });
    });

    describe('passwordResetEnumerationList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findPasswordResetEnumerationOffset.mockResolvedValue(
                page
            );

            const result =
                await service.passwordResetEnumerationList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.findPasswordResetEnumerationOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findPasswordResetEnumerationOffset
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2, pagination);
        });
    });

    describe('sharedFingerprintSummary', () => {
        it('reads the stored summary and no repository', async () => {
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 4,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            const result = await service.sharedFingerprintSummary();

            expect(result).toEqual({
                count: 4,
                windowStart: null,
                windowEnd: null,
                computedAt,
            });
            expect(analyticSnapshotService.getSummary).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.sharedFingerprint,
                AnalyticSnapshotNullMetaSchema
            );
            expect(cacheService.readThrough).not.toHaveBeenCalled();
            expect(
                analyticFraudRepository.findSharedFingerprints
            ).not.toHaveBeenCalled();
        });

        it('answers an empty summary with a null computedAt before the first run', async () => {
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });

            const result = await service.sharedFingerprintSummary();

            expect(result).toEqual({
                count: 0,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });
        });
    });

    describe('sharedFingerprintList', () => {
        it('returns the stored page and reads no repository', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        fingerprint: 'fp-1',
                        userCount: 3,
                        userIds: ['user-1', 'user-2', 'user-3'],
                    },
                ],
                metadata: { computedAt },
            };
            analyticSnapshotService.getListOffset.mockResolvedValue(page);
            const params = { skip: 1, limit: 1, orderBy };

            const result = await service.sharedFingerprintList(params);

            expect(result).toBe(page);
            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.sharedFingerprint,
                params,
                null,
                AnalyticSharedFingerprintSnapshotDataSchema
            );
            expect(
                analyticFraudRepository.findSharedFingerprints
            ).not.toHaveBeenCalled();
        });
    });

    describe('computeSharedFingerprint', () => {
        it('returns one row per fingerprint keyed by it with the user count as value', async () => {
            const rows = [
                {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
                {
                    fingerprint: 'fp-2',
                    userCount: 2,
                    userIds: ['user-4', 'user-5'],
                },
            ];
            analyticFraudRepository.findSharedFingerprints.mockResolvedValue(
                rows
            );

            const result = await service.computeSharedFingerprint();

            expect(
                analyticFraudRepository.findSharedFingerprints
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findSharedFingerprints
            ).toHaveBeenCalledWith(2);
            expect(result).toEqual({
                items: [
                    {
                        key: 'fp-1',
                        value: 3,
                        occurredAt: null,
                        data: rows[0],
                    },
                    {
                        key: 'fp-2',
                        value: 2,
                        occurredAt: null,
                        data: rows[1],
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            });
        });

        it('returns no rows when no fingerprint is shared', async () => {
            analyticFraudRepository.findSharedFingerprints.mockResolvedValue(
                []
            );

            const result = await service.computeSharedFingerprint();

            expect(result.items).toEqual([]);
        });
    });

    describe('forgotPasswordTokenAbuseSummary', () => {
        it('reads through with the forgot-password-token-abuse key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...onRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.forgotPasswordTokenAbuseSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'forgot-password-token-abuse:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countForgotPasswordAbuse.mockResolvedValue(
                3
            );

            const result = await service.forgotPasswordTokenAbuseSummary();
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.countForgotPasswordAbuse
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countForgotPasswordAbuse
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2);
            expect(result).toEqual({ count: 3, ...onRequestWindow });
        });
    });

    describe('forgotPasswordTokenAbuseList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findForgotPasswordAbuseOffset.mockResolvedValue(
                page
            );

            const result =
                await service.forgotPasswordTokenAbuseList(pagination);

            expect(result).toBe(page);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                analyticFraudRepository.findForgotPasswordAbuseOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findForgotPasswordAbuseOffset
            ).toHaveBeenCalledWith({ startDate, endDate: now }, 2, pagination);
        });
    });

    describe('computeRiskScore', () => {
        const items = [
            {
                key: 'user-1',
                value: 48,
                occurredAt: null,
                data: {
                    userId: 'user-1',
                    score: 48,
                    band: EnumAnalyticFraudBand.review,
                    contributingSignalCodes: [
                        EnumAnalyticFraudContributingSignal.sharedFingerprint,
                        EnumAnalyticFraudContributingSignal.nearLockout,
                    ],
                },
            },
        ];

        it('calls findRiskScoreCandidates once with the fixed now, the near-lockout threshold, and the configured weights, bands, and windows', async () => {
            analyticFraudRepository.findRiskScoreCandidates.mockResolvedValue(
                items
            );

            const result = await service.computeRiskScore();

            expect(
                analyticFraudRepository.findRiskScoreCandidates
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findRiskScoreCandidates
            ).toHaveBeenCalledWith({
                now,
                nearLockoutMinAttempt: 4,
                riskScore: { lookbackInMs: 3600000 },
                credentialStuffing: {
                    windowInMs: 86400000,
                    minUniqueAccounts: 2,
                },
                accountTakeover: { newDeviceAfterPasswordChangeInMs: 3600000 },
                massRegistration: { windowInMs: 86400000, minAccountsPerIp: 2 },
                sharedFingerprint: { minUsersPerFingerprint: 2 },
                sessionAfterAdmin: { sessionAfterAdminRevokeInMs: 3600000 },
                forgotPasswordTokenAbuse: {
                    windowInMs: 86400000,
                    minUnusedTokens: 2,
                },
                impossibleTravel: { minDistanceKm: 500, maxDeltaInMs: 1800000 },
                weights: {
                    sessionAfterAdmin: 1,
                    impossibleTravel: 2,
                    newDeviceAfterPasswordChange: 4,
                    credentialStuffingIp: 8,
                    sharedFingerprint: 16,
                    nearLockout: 32,
                    massRegistrationIp: 64,
                    forgotPasswordAbuse: 128,
                },
                bands: { monitorMax: 10, reviewMax: 30, elevateMax: 50 },
            });
            expect(result).toEqual({
                items,
                metadata: null,
                windowStart: startDate,
                windowEnd: now,
            });
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
        });

        it('reads the password budget once and turns it into the threshold', async () => {
            analyticFraudRepository.findRiskScoreCandidates.mockResolvedValue(
                []
            );

            await service.computeRiskScore();

            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledTimes(
                1
            );
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordMaxAttempts
            );
            expect(analyticFraudUtil.nearLockoutThreshold).toHaveBeenCalledWith(
                5
            );
            expect(
                analyticFraudRepository.findSharedFingerprints
            ).not.toHaveBeenCalled();
        });
    });

    describe('riskScore', () => {
        const stored = {
            userId: 'user-1',
            score: 50,
            band: EnumAnalyticFraudBand.elevate,
            contributingSignalCodes: [
                EnumAnalyticFraudContributingSignal.impossibleTravel,
                EnumAnalyticFraudContributingSignal.sharedFingerprint,
                EnumAnalyticFraudContributingSignal.nearLockout,
            ],
        };

        it('returns the stored item with the computedAt of the header', async () => {
            analyticFraudRepository.existsUserById.mockResolvedValue(true);
            analyticSnapshotService.getOneByKey.mockResolvedValue({
                item: stored,
                computedAt,
            });

            const result = await service.riskScore('user-1');

            expect(result).toEqual({ ...stored, computedAt });
            expect(analyticSnapshotService.getOneByKey).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.riskScore,
                'user-1',
                AnalyticRiskScoreSnapshotDataSchema
            );
            expect(analyticSnapshotService.getSummary).not.toHaveBeenCalled();
        });

        it('answers score zero in the monitor band with the header computedAt when no item names the user', async () => {
            analyticFraudRepository.existsUserById.mockResolvedValue(true);
            analyticSnapshotService.getOneByKey.mockResolvedValue({
                item: null,
                computedAt,
            });

            const result = await service.riskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
                computedAt,
            });
            expect(analyticSnapshotService.getOneByKey).toHaveBeenCalledTimes(
                1
            );
            expect(analyticSnapshotService.getSummary).not.toHaveBeenCalled();
        });

        it('answers a null computedAt before the first run', async () => {
            analyticFraudRepository.existsUserById.mockResolvedValue(true);
            analyticSnapshotService.getOneByKey.mockResolvedValue({
                item: null,
                computedAt: null,
            });

            const result = await service.riskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
                computedAt: null,
            });
        });

        it('throws UserNotFoundException for a missing user and reads no snapshot', async () => {
            analyticFraudRepository.existsUserById.mockResolvedValue(false);

            await expect(service.riskScore('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.notFound',
            });
            expect(analyticSnapshotService.getOneByKey).not.toHaveBeenCalled();
        });
    });

    describe('riskScores', () => {
        const listed = {
            ...offsetPage,
            data: [
                {
                    userId: 'user-1',
                    score: 50,
                    band: EnumAnalyticFraudBand.elevate,
                    contributingSignalCodes: [
                        EnumAnalyticFraudContributingSignal.nearLockout,
                    ],
                },
            ],
        };

        it('passes the minScore as a value filter and returns the stored page', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(listed);

            const result = await service.riskScores(30, pagination);

            expect(result).toBe(listed);
            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.riskScore,
                pagination,
                { value: { gte: 30 } },
                AnalyticRiskScoreSnapshotDataSchema
            );
        });

        it('passes no filter for a null minScore', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(listed);

            await service.riskScores(null, pagination);

            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.riskScore,
                pagination,
                null,
                AnalyticRiskScoreSnapshotDataSchema
            );
        });
    });
});
