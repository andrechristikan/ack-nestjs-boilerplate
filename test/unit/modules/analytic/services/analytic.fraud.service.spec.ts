import { CacheService } from '@common/cache/services/cache.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
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
import { AnalyticFraudCredentialStuffingSummaryCacheSchema } from '@modules/analytic/dtos/analytic.fraud-credential-stuffing-summary-cache.dto';
import { AnalyticFraudSummaryCacheSchema } from '@modules/analytic/dtos/analytic.fraud-summary-cache.dto';
import { AnalyticRiskScoreSnapshotDataSchema } from '@modules/analytic/dtos/analytic.risk-score-snapshot-data.dto';
import { AnalyticSharedFingerprintSnapshotDataSchema } from '@modules/analytic/dtos/analytic.shared-fingerprint-snapshot-data.dto';
import { AnalyticSnapshotNullMetaSchema } from '@modules/analytic/dtos/analytic.snapshot-null-meta.dto';

describe('AnalyticFraudService', () => {
    const liveSummaryTtlInMs = 60000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        liveSummaryTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const analyticFraudRepository: MockProxy<AnalyticFraudRepository> =
        mock<AnalyticFraudRepository>();

    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const dayWindow = {
        startDate: new Date('2026-02-28T00:00:00.000Z'),
        endDate: now,
    };
    const hourWindow = {
        startDate: new Date('2026-02-28T23:00:00.000Z'),
        endDate: now,
    };
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

    const dayRequestWindow = {
        windowStart: dayWindow.startDate,
        windowEnd: now,
        computedAt: null,
    };
    const hourRequestWindow = {
        windowStart: hourWindow.startDate,
        windowEnd: now,
        computedAt: null,
    };

    const computedAt: Date = new Date('2026-03-01T00:15:00.000Z');

    const configValues: Record<string, number | string> = {
        'analytic.fraud.nearLockoutOffset': 1,
        'analytic.fraud.credentialStuffingWindowInMs': 86400000,
        'analytic.fraud.credentialStuffingMinUniqueAccounts': 2,
        'analytic.fraud.accountTakeoverNewDeviceAfterPasswordChangeInMs': 3600000,
        'analytic.fraud.massRegistrationWindowInMs': 86400000,
        'analytic.fraud.massRegistrationMinAccountsPerIp': 2,
        'analytic.fraud.passwordResetEnumerationWindowInMs': 86400000,
        'analytic.fraud.passwordResetEnumerationMinRequestsPerIp': 2,
        'analytic.fraud.sharedFingerprintMinUsersPerFingerprint': 2,
        'analytic.fraud.sessionAfterAdmin.sessionAfterAdminRevokeInMs': 3600000,
        'analytic.fraud.forgotPasswordTokenAbuseWindowInMs': 86400000,
        'analytic.fraud.forgotPasswordTokenAbuseMinUnusedTokens': 2,
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
        'analytic.fraud.riskScoreLookbackInMs': 3600000,
        'analytic.anomaly.impossibleTravelMinDistanceKm': 500,
        'analytic.anomaly.impossibleTravelMaxDeltaInMs': 1800000,
    };

    let service: AnalyticFraudService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        analyticCache.buildFraudSummaryKey.mockImplementation(
            (signal, window) => `${signal}:${window}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
        featureFlagService.getMetadataNumber.mockResolvedValue(5);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                ...TestUnitKitProviders,
                AnalyticDateUtil,
                AnalyticFraudUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
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

    describe('getFraudCredentialStuffing', () => {
        it('reads through with the credentialStuffing key, the metadata cache schema, and the fraud summary TTL', async () => {
            const cached = {
                count: 4,
                ...dayRequestWindow,
                metadata: { minUniqueAccounts: 2 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudCredentialStuffing();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'credentialStuffing:86400000',
                AnalyticFraudCredentialStuffingSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and minimum on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countCredentialStuffing.mockResolvedValue(
                4
            );

            const result = await service.getFraudCredentialStuffing();

            expect(
                analyticFraudRepository.countCredentialStuffing
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countCredentialStuffing
            ).toHaveBeenCalledWith(dayWindow, 2);
            expect(result).toEqual({
                count: 4,
                ...dayRequestWindow,
                metadata: { minUniqueAccounts: 2 },
            });
        });
    });

    describe('getFraudCredentialStuffingList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findCredentialStuffingOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudCredentialStuffingList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findCredentialStuffingOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findCredentialStuffingOffset
            ).toHaveBeenCalledWith(dayWindow, 2, pagination);
        });
    });

    describe('getFraudAccountTakeover', () => {
        it('reads through with the accountTakeover key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, ...dayRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudAccountTakeover();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.accountTakeover,
                '3600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'accountTakeover:3600000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countAccountTakeover.mockResolvedValue(3);

            const result = await service.getFraudAccountTakeover();

            expect(
                analyticFraudRepository.countAccountTakeover
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countAccountTakeover
            ).toHaveBeenCalledWith(hourWindow, 3600000);
            expect(result).toEqual({ count: 3, ...hourRequestWindow });
        });
    });

    describe('getFraudAccountTakeoverList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findAccountTakeoverOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudAccountTakeoverList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findAccountTakeoverOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findAccountTakeoverOffset
            ).toHaveBeenCalledWith(hourWindow, 3600000, pagination);
        });
    });

    describe('getFraudSessionAfterAdmin', () => {
        it('reads through with the sessionAfterAdmin key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, ...hourRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudSessionAfterAdmin();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.sessionAfterAdmin,
                '3600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'sessionAfterAdmin:3600000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window on a cache miss and answers a null computedAt', async () => {
            analyticFraudRepository.countSessionAfterAdmin.mockResolvedValue(3);

            const result = await service.getFraudSessionAfterAdmin();

            expect(
                analyticFraudRepository.countSessionAfterAdmin
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countSessionAfterAdmin
            ).toHaveBeenCalledWith(hourWindow, 3600000);
            expect(result).toEqual({ count: 3, ...hourRequestWindow });
        });
    });

    describe('getFraudSessionAfterAdminList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findSessionAfterAdminOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudSessionAfterAdminList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findSessionAfterAdminOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findSessionAfterAdminOffset
            ).toHaveBeenCalledWith(hourWindow, 3600000, pagination);
        });
    });

    describe('getFraudMassRegistration', () => {
        it('reads through with the massRegistration key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...hourRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudMassRegistration();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'massRegistration:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countMassRegistration.mockResolvedValue(3);

            const result = await service.getFraudMassRegistration();
            expect(
                analyticFraudRepository.countMassRegistration
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countMassRegistration
            ).toHaveBeenCalledWith(dayWindow, 2);
            expect(result).toEqual({ count: 3, ...dayRequestWindow });
        });
    });

    describe('getFraudMassRegistrationList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findMassRegistrationOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudMassRegistrationList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findMassRegistrationOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findMassRegistrationOffset
            ).toHaveBeenCalledWith(dayWindow, 2, pagination);
        });
    });

    describe('getFraudPasswordResetEnumeration', () => {
        it('reads through with the passwordResetEnumeration key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...dayRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudPasswordResetEnumeration();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.passwordResetEnumeration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'passwordResetEnumeration:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countPasswordResetEnumeration.mockResolvedValue(
                3
            );

            const result = await service.getFraudPasswordResetEnumeration();
            expect(
                analyticFraudRepository.countPasswordResetEnumeration
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countPasswordResetEnumeration
            ).toHaveBeenCalledWith(dayWindow, 2);
            expect(result).toEqual({ count: 3, ...dayRequestWindow });
        });
    });

    describe('getFraudPasswordResetEnumerationList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findPasswordResetEnumerationOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudPasswordResetEnumerationList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findPasswordResetEnumerationOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findPasswordResetEnumerationOffset
            ).toHaveBeenCalledWith(dayWindow, 2, pagination);
        });
    });

    describe('getFraudSharedFingerprint', () => {
        it('reads the stored summary and no repository', async () => {
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 4,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            const result = await service.getFraudSharedFingerprint();

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

            const result = await service.getFraudSharedFingerprint();

            expect(result).toEqual({
                count: 0,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });
        });
    });

    describe('getFraudSharedFingerprintList', () => {
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

            const result = await service.getFraudSharedFingerprintList(params);

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

    describe('getFraudForgotPasswordTokenAbuse', () => {
        it('reads through with the forgotPasswordTokenAbuse key, AnalyticFraudSummaryCacheSchema, and the live summary TTL', async () => {
            const cached = { count: 1, ...dayRequestWindow };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getFraudForgotPasswordTokenAbuse();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'forgotPasswordTokenAbuse:86400000',
                AnalyticFraudSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once with the configured window and the minimum on a cache miss', async () => {
            analyticFraudRepository.countForgotPasswordAbuse.mockResolvedValue(
                3
            );

            const result = await service.getFraudForgotPasswordTokenAbuse();
            expect(
                analyticFraudRepository.countForgotPasswordAbuse
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.countForgotPasswordAbuse
            ).toHaveBeenCalledWith(dayWindow, 2);
            expect(result).toEqual({ count: 3, ...dayRequestWindow });
        });
    });

    describe('getFraudForgotPasswordTokenAbuseList', () => {
        it('returns the repository page for the configured window unchanged', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudRepository.findForgotPasswordAbuseOffset.mockResolvedValue(
                page
            );

            const result =
                await service.getFraudForgotPasswordTokenAbuseList(pagination);

            expect(result).toBe(page);
            expect(
                analyticFraudRepository.findForgotPasswordAbuseOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findForgotPasswordAbuseOffset
            ).toHaveBeenCalledWith(dayWindow, 2, pagination);
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
                windowStart: hourWindow.startDate,
                windowEnd: now,
            });
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
            expect(
                analyticFraudRepository.findSharedFingerprints
            ).not.toHaveBeenCalled();
        });
    });

    describe('getFraudRiskScore', () => {
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

        it('throws UserNotFoundException when the read finds no live user and reads nothing else', async () => {
            analyticFraudRepository.findRiskScoreByUser.mockResolvedValue(null);

            await expect(
                service.getFraudRiskScore('missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
            expect(
                analyticFraudRepository.findRiskScoreByUser
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findRiskScoreByUser
            ).toHaveBeenCalledWith('missing');
            expect(analyticSnapshotService.getSummary).not.toHaveBeenCalled();
            expect(
                analyticSnapshotService.getListOffset
            ).not.toHaveBeenCalled();
        });

        it('returns the stored item with the computedAt of the header', async () => {
            analyticFraudRepository.findRiskScoreByUser.mockResolvedValue({
                item: stored,
                computedAt,
            });

            const result = await service.getFraudRiskScore('user-1');

            expect(result).toEqual({ ...stored, computedAt });
            expect(
                analyticFraudRepository.findRiskScoreByUser
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticFraudRepository.findRiskScoreByUser
            ).toHaveBeenCalledWith('user-1');
        });

        it('answers score zero in the monitor band with the header computedAt when no item names the user', async () => {
            analyticFraudRepository.findRiskScoreByUser.mockResolvedValue({
                item: null,
                computedAt,
            });

            const result = await service.getFraudRiskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
                computedAt,
            });
        });

        it('answers a null computedAt before the first run', async () => {
            analyticFraudRepository.findRiskScoreByUser.mockResolvedValue({
                item: null,
                computedAt: null,
            });

            const result = await service.getFraudRiskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
                computedAt: null,
            });
        });
    });

    describe('getFraudRiskScoreList', () => {
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

            const result = await service.getFraudRiskScoreList(30, pagination);

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

            await service.getFraudRiskScoreList(null, pagination);

            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.riskScore,
                pagination,
                null,
                AnalyticRiskScoreSnapshotDataSchema
            );
        });
    });
});
