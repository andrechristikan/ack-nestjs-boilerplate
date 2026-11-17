import { chunk } from 'lodash-es';
import { Duration } from 'luxon';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticCacheEmptyToken,
    AnalyticFraudCredentialStuffingSummaryCacheSchema,
    AnalyticFraudRiskScoreCacheSchema,
    AnalyticFraudSummaryCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    AnalyticAccountTakeoverAvailableOrderBy,
    AnalyticBackupCodeNewDeviceAvailableOrderBy,
    AnalyticCredentialStuffingAvailableOrderBy,
    AnalyticForgotPasswordAbuseAvailableOrderBy,
    AnalyticFraudRiskScoreAvailableOrderBy,
    AnalyticKeyCountAvailableOrderBy,
    AnalyticSessionAfterAdminAvailableOrderBy,
    AnalyticSharedFingerprintAvailableOrderBy,
    AnalyticUserCountAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticFraudSignalRows,
    IAnalyticFraudSignalUsers,
} from '@modules/analytic/interfaces/analytic.fraud.interface';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { PasswordHistoryAnalyticService } from '@modules/password-history/services/password-history.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserForgotPasswordAnalyticService } from '@modules/user/services/user.forgot-password.analytic.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('AnalyticFraudService', () => {
    const fraudSummaryTtlInMs = 900000;
    const riskScoreTtlInMs = 600000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        fraudSummaryTtlInMs,
        riskScoreTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticSortUtil: MockProxy<AnalyticSortUtil> =
        mock<AnalyticSortUtil>();
    const analyticFraudUtil: MockProxy<AnalyticFraudUtil> =
        mock<AnalyticFraudUtil>();
    const analyticAnomalyUtil: MockProxy<AnalyticAnomalyUtil> =
        mock<AnalyticAnomalyUtil>();
    const analyticBucketUtil: MockProxy<AnalyticBucketUtil> =
        mock<AnalyticBucketUtil>();
    const paginationOffsetUtil: MockProxy<PaginationOffsetUtil> =
        mock<PaginationOffsetUtil>();
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();
    const activityLogAnalyticService: MockProxy<ActivityLogAnalyticService> =
        mock<ActivityLogAnalyticService>();
    const userAnalyticService: MockProxy<UserAnalyticService> =
        mock<UserAnalyticService>();
    const passwordHistoryAnalyticService: MockProxy<PasswordHistoryAnalyticService> =
        mock<PasswordHistoryAnalyticService>();
    const userForgotPasswordAnalyticService: MockProxy<UserForgotPasswordAnalyticService> =
        mock<UserForgotPasswordAnalyticService>();
    const deviceAnalyticService: MockProxy<DeviceAnalyticService> =
        mock<DeviceAnalyticService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const windowEnd: Date = new Date('2026-01-01T01:00:00.000Z');
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

    const emptyPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 5000,
        hasNext: false,
        data: [],
    };

    const configValues: Record<string, number | string> = {
        'analytic.fraud.concurrency': 10,
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
        'analytic.fraud.refreshSpike.windowInMs': 86400000,
        'analytic.fraud.refreshSpike.minCount': 2,
        'analytic.fraud.backupCodeNewDevice.windowInMs': 86400000,
        'analytic.fraud.backupCodeNewDevice.newDeviceAfterInMs': 7200000,
        'analytic.fraud.apiKeyBurst.windowInMs': 86400000,
        'analytic.fraud.apiKeyBurst.minCount': 2,
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
        'analytic.fraud.riskScore.candidateLimit': 3,
        'analytic.fraud.riskScore.lookbackInMs': 3600000,
    };

    const emptySignals: IAnalyticFraudSignalUsers = {
        sessionAfterAdmin: new Set(),
        impossibleTravel: new Set(),
        newDeviceAfterPasswordChange: new Set(),
        credentialStuffingIp: new Set(),
        sharedFingerprint: new Set(),
        massRegistrationIp: new Set(),
        forgotPasswordAbuse: new Set(),
    };

    let service: AnalyticFraudService;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperArrayService.chunk.mockImplementation((rows, size) =>
            chunk(rows, size)
        );
        configGet.mockImplementation((key: string) => configValues[key]);
        analyticCache.buildFraudSummaryKey.mockImplementation(
            (signal, window) => `${signal}:${window}`
        );
        analyticCache.buildRiskScoreKey.mockImplementation(
            userId => `RiskScore:${userId}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
        analyticDateService.resolveWindow.mockImplementation(
            (windowMs, defaultInMs) => windowMs ?? defaultInMs
        );
        analyticDateUtil.windowToken.mockReturnValue('window-token');
        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(startDate);
        helperDateService.forward.mockReturnValue(windowEnd);
        analyticSortUtil.sortPage.mockReturnValue({ data: [], total: 0 });
        analyticDateUtil.windowRange.mockReturnValue({
            startDate,
            endDate: now,
        });
        analyticAnomalyUtil.groupByIp.mockReturnValue(new Map());
        analyticBucketUtil.toBuckets.mockReturnValue([]);
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);
        paginationOffsetUtil.page.mockReturnValue(offsetPage);
        activityLogAnalyticService.getPageByActionsInRange.mockResolvedValue(
            emptyPage
        );
        activityLogAnalyticService.getGroupIpUserByActions.mockResolvedValue(
            []
        );
        activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([]);
        activityLogAnalyticService.getGroupUserIdByIps.mockResolvedValue([]);
        activityLogAnalyticService.getGroupIpByActions.mockResolvedValue([]);
        analyticAnomalyService.getImpossibleTravelUserIds.mockResolvedValue([]);
        passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue([]);
        userForgotPasswordAnalyticService.getUnusedTokenCountsByUser.mockResolvedValue(
            []
        );
        userAnalyticService.getNearLockout.mockResolvedValue([]);
        userAnalyticService.getManyByIds.mockResolvedValue([]);
        deviceAnalyticService.getSharedFingerprints.mockResolvedValue([]);
        deviceAnalyticService.existsCreatedInRangeByUser.mockResolvedValue(
            false
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                {
                    provide: AnalyticDateService,
                    useValue: analyticDateService,
                },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticSortUtil, useValue: analyticSortUtil },
                { provide: AnalyticFraudUtil, useValue: analyticFraudUtil },
                {
                    provide: AnalyticAnomalyUtil,
                    useValue: analyticAnomalyUtil,
                },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                {
                    provide: PaginationOffsetUtil,
                    useValue: paginationOffsetUtil,
                },
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                {
                    provide: ActivityLogAnalyticService,
                    useValue: activityLogAnalyticService,
                },
                { provide: UserAnalyticService, useValue: userAnalyticService },
                {
                    provide: PasswordHistoryAnalyticService,
                    useValue: passwordHistoryAnalyticService,
                },
                {
                    provide: UserForgotPasswordAnalyticService,
                    useValue: userForgotPasswordAnalyticService,
                },
                {
                    provide: DeviceAnalyticService,
                    useValue: deviceAnalyticService,
                },
            ],
        }).compile();

        service = module.get(AnalyticFraudService);
    });

    describe('credentialStuffingSummary', () => {
        it('reads through with the credential-stuffing key, AnalyticFraudCredentialStuffingSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = {
                count: 2,
                window: '86400000',
                meta: { minUniqueAccounts: 2 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.credentialStuffingSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'credential-stuffing:86400000',
                AnalyticFraudCredentialStuffingSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.credentialStuffingSummary(600000);

            expect(result).toEqual({
                count: 0,
                window: '600000',
                meta: { minUniqueAccounts: 2 },
            });
            expect(analyticDateService.resolveWindow).toHaveBeenCalledWith(
                600000,
                86400000
            );
        });
    });

    describe('credentialStuffingList', () => {
        it('pages computed rows', async () => {
            const result = await service.credentialStuffingList(
                null,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                { ipAddress: '10.0.0.1', uniqueUsers: 4, failCount: 9 },
                { ipAddress: '10.0.0.2', uniqueUsers: 2, failCount: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.credentialStuffingList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticCredentialStuffingAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('accountTakeoverSummary', () => {
        it('reads through with the account-takeover key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: 'window-token' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.accountTakeover,
                'window-token'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'account-takeover:window-token',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue(
                []
            );

            const result = await service.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, window: 'window-token' });
        });
    });

    describe('accountTakeoverList', () => {
        it('chunks the profile changes by analytic.fraud.concurrency', async () => {
            passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue(
                []
            );

            await service.accountTakeoverList(startDate, endDate, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue(
                []
            );

            const result = await service.accountTakeoverList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue(
                []
            );
            const sorted = [
                {
                    userId: 'user-1',
                    indicatorCodes: ['newDevice'],
                    passwordChangedAt: startDate,
                },
                {
                    userId: 'user-2',
                    indicatorCodes: ['newDevice'],
                    passwordChangedAt: endDate,
                },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.accountTakeoverList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticAccountTakeoverAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('massRegistrationSummary', () => {
        it('reads through with the mass-registration key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.massRegistrationSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'mass-registration:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );

            const result = await service.massRegistrationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('massRegistrationList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );

            expect(
                await service.massRegistrationList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.massRegistrationList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticKeyCountAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('passwordResetEnumerationSummary', () => {
        it('reads through with the password-reset-enumeration key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.passwordResetEnumerationSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.passwordResetEnumeration,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'password-reset-enumeration:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );

            const result = await service.passwordResetEnumerationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('passwordResetEnumerationList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );

            expect(
                await service.passwordResetEnumerationList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                []
            );
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.passwordResetEnumerationList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticKeyCountAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('sharedFingerprintSummary', () => {
        it('reads through with the shared-fingerprint key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: null };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.sharedFingerprintSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.sharedFingerprint,
                AnalyticCacheEmptyToken
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `shared-fingerprint:${AnalyticCacheEmptyToken}`,
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            deviceAnalyticService.getSharedFingerprints.mockResolvedValue([]);

            const result = await service.sharedFingerprintSummary();

            expect(result).toEqual({ count: 0, window: null });
        });
    });

    describe('sharedFingerprintList', () => {
        it('pages shared fingerprint rows', async () => {
            const row = {
                fingerprint: 'fp-1',
                userCount: 3,
                userIds: ['user-1', 'user-2', 'user-3'],
            };
            deviceAnalyticService.getSharedFingerprints.mockResolvedValue([
                row,
            ]);
            analyticSortUtil.sortPage.mockReturnValue({
                data: [row],
                total: 1,
            });

            const result = await service.sharedFingerprintList({
                skip: 0,
                limit: 1,
                orderBy: [],
            });

            expect(result).toEqual(offsetPage);
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [
                    {
                        fingerprint: 'fp-1',
                        userCount: 3,
                        userIds: ['user-1', 'user-2', 'user-3'],
                    },
                ],
                1,
                { skip: 0, limit: 1 }
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const rows = [
                {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
            ];
            deviceAnalyticService.getSharedFingerprints.mockResolvedValue(rows);
            const sorted = [
                {
                    fingerprint: 'fp-2',
                    userCount: 4,
                    userIds: ['user-4'],
                },
                {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.sharedFingerprintList({
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                rows,
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticSharedFingerprintAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('sessionAfterAdminSummary', () => {
        it('reads through with the session-after-admin key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: 'window-token' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.sessionAfterAdminSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.sessionAfterAdmin,
                'window-token'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'session-after-admin:window-token',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.sessionAfterAdminSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, window: 'window-token' });
        });
    });

    describe('sessionAfterAdminList', () => {
        it('chunks the revokes by analytic.fraud.concurrency', async () => {
            await service.sessionAfterAdminList(startDate, endDate, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            expect(
                await service.sessionAfterAdminList(
                    startDate,
                    endDate,
                    pagination
                )
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                {
                    userId: 'user-1',
                    revokedAt: startDate,
                    loginAt: endDate,
                },
                {
                    userId: 'user-2',
                    revokedAt: startDate,
                    loginAt: endDate,
                },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.sessionAfterAdminList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticSessionAfterAdminAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('forgotPasswordTokenAbuseSummary', () => {
        it('reads through with the forgot-password-token-abuse key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.forgotPasswordTokenAbuseSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.forgotPasswordTokenAbuse,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'forgot-password-token-abuse:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            userForgotPasswordAnalyticService.getUnusedTokenCountsByUser.mockResolvedValue(
                []
            );

            const result = await service.forgotPasswordTokenAbuseSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('forgotPasswordTokenAbuseList', () => {
        it('pages computed rows', async () => {
            userForgotPasswordAnalyticService.getUnusedTokenCountsByUser.mockResolvedValue(
                []
            );

            expect(
                await service.forgotPasswordTokenAbuseList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            userForgotPasswordAnalyticService.getUnusedTokenCountsByUser.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', tokenCount: 9 },
                { userId: 'user-2', tokenCount: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.forgotPasswordTokenAbuseList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticForgotPasswordAbuseAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('refreshSpikeSummary', () => {
        it('reads through with the refresh-spike key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.refreshSpikeSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.refreshSpike,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'refresh-spike:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.refreshSpikeSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('refreshSpikeList', () => {
        it('pages computed rows', async () => {
            expect(await service.refreshSpikeList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.refreshSpikeList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticUserCountAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('backupCodeNewDeviceSummary', () => {
        it('reads through with the backup-code-new-device key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.backupCodeNewDeviceSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.backupCodeNewDevice,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'backup-code-new-device:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.backupCodeNewDeviceSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('backupCodeNewDeviceList', () => {
        it('chunks the regenerations by analytic.fraud.concurrency', async () => {
            await service.backupCodeNewDeviceList(null, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            expect(
                await service.backupCodeNewDeviceList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                { userId: 'user-1', regeneratedAt: startDate },
                { userId: 'user-2', regeneratedAt: endDate },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.backupCodeNewDeviceList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticBackupCodeNewDeviceAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('apiKeyBurstSummary', () => {
        it('reads through with the api-key-burst key, AnalyticFraudSummaryCacheSchema, and the fraud summary TTL', async () => {
            const cached = { count: 1, window: '86400000' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.apiKeyBurstSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildFraudSummaryKey).toHaveBeenCalledWith(
                EnumAnalyticFraudSignal.apiKeyBurst,
                '86400000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'api-key-burst:86400000',
                AnalyticFraudSummaryCacheSchema,
                fraudSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.apiKeyBurstSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('apiKeyBurstList', () => {
        it('pages computed rows', async () => {
            expect(await service.apiKeyBurstList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.apiKeyBurstList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticUserCountAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('riskScore', () => {
        const user = {
            id: 'user-1',
            email: 'user@example.com',
            passwordAttempt: 4,
            passwordLockedUntil: null,
        };
        const scored = {
            userId: 'user-1',
            score: 50,
            band: EnumAnalyticFraudBand.elevate,
            contributingSignalCodes: [
                EnumAnalyticFraudContributingSignal.impossibleTravel,
                EnumAnalyticFraudContributingSignal.sharedFingerprint,
                EnumAnalyticFraudContributingSignal.nearLockout,
            ],
        };

        it('reads through with the risk score key, AnalyticFraudRiskScoreCacheSchema, and the risk score TTL', async () => {
            const cached = {
                userId: 'user-1',
                score: 10,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.nearLockout,
                ],
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.riskScore('user-1');

            expect(result).toEqual(cached);
            expect(analyticCache.buildRiskScoreKey).toHaveBeenCalledWith(
                'user-1'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'RiskScore:user-1',
                AnalyticFraudRiskScoreCacheSchema,
                riskScoreTtlInMs,
                expect.any(Function)
            );
            expect(userAnalyticService.getOneById).not.toHaveBeenCalled();
        });

        it('collects the signal users over the lookback window and scores the user in the loader', async () => {
            const shared = [
                {
                    fingerprint: 'fp-1',
                    userCount: 2,
                    userIds: ['user-1', 'user-9'],
                },
            ];
            userAnalyticService.getOneById.mockResolvedValue(user);
            analyticAnomalyService.getImpossibleTravelUserIds.mockResolvedValue(
                ['user-1']
            );
            deviceAnalyticService.getSharedFingerprints.mockResolvedValue(
                shared
            );

            const result = await service.riskScore('user-1');

            expect(result).toEqual(scored);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticAnomalyService.getImpossibleTravelUserIds
            ).toHaveBeenCalledWith(startDate, now);
        });
    });

    describe('riskScore with a locked account', () => {
        it('carries the nearLockout signal for a user with no attempts and a lock ending after now', async () => {
            userAnalyticService.getOneById.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                passwordAttempt: 0,
                passwordLockedUntil: new Date('2026-03-01T00:10:00.000Z'),
            });

            const result = await service.riskScore('user-1');

            expect(result.contributingSignalCodes).toEqual([
                EnumAnalyticFraudContributingSignal.nearLockout,
            ]);
        });

        it('carries no nearLockout signal for a user with no attempts and a lock that ended before now', async () => {
            userAnalyticService.getOneById.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                passwordAttempt: 0,
                passwordLockedUntil: new Date('2026-02-28T23:50:00.000Z'),
            });

            const result = await service.riskScore('user-1');

            expect(result.contributingSignalCodes).toEqual([]);
        });
    });

    describe('riskScores', () => {
        const shared = [
            {
                fingerprint: 'fp-1',
                userCount: 2,
                userIds: ['user-low', 'user-high'],
            },
        ];
        const nearLockout = [
            {
                id: 'user-high',
                email: 'high@example.com',
                passwordAttempt: 4,
                lastLoginAt: null,
                createdAt: now,
            },
        ];
        const low = {
            id: 'user-low',
            email: 'low@example.com',
            passwordAttempt: 1,
            passwordLockedUntil: null,
        };
        const high = {
            id: 'user-high',
            email: 'high@example.com',
            passwordAttempt: 4,
            passwordLockedUntil: null,
        };
        const lowScore = {
            userId: 'user-low',
            score: 16,
            band: EnumAnalyticFraudBand.review,
            contributingSignalCodes: [
                EnumAnalyticFraudContributingSignal.sharedFingerprint,
            ],
        };
        const highScore = {
            userId: 'user-high',
            score: 48,
            band: EnumAnalyticFraudBand.elevate,
            contributingSignalCodes: [
                EnumAnalyticFraudContributingSignal.sharedFingerprint,
                EnumAnalyticFraudContributingSignal.nearLockout,
            ],
        };

        beforeEach(() => {
            deviceAnalyticService.getSharedFingerprints.mockResolvedValue(
                shared
            );
            userAnalyticService.getNearLockout.mockResolvedValue(nearLockout);
            userAnalyticService.getManyByIds.mockResolvedValue([low, high]);
        });

        it('reads the signal users once and picks the candidates from the signals and the near-lockout users', async () => {
            await service.riskScores(null, pagination);

            expect(
                deviceAnalyticService.getSharedFingerprints
            ).toHaveBeenCalledTimes(1);
            expect(analyticFraudUtil.nearLockoutThreshold).toHaveBeenCalledWith(
                5
            );
            expect(userAnalyticService.getNearLockout).toHaveBeenCalledWith(
                4,
                now,
                3
            );
            expect(userAnalyticService.getManyByIds).toHaveBeenCalledWith([
                'user-low',
                'user-high',
            ]);
        });

        it('scores the candidates in chunks of analytic.fraud.concurrency', async () => {
            await service.riskScores(null, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith(
                [low, high],
                10
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'RiskScore:user-low',
                AnalyticFraudRiskScoreCacheSchema,
                riskScoreTtlInMs,
                expect.any(Function)
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'RiskScore:user-high',
                AnalyticFraudRiskScoreCacheSchema,
                riskScoreTtlInMs,
                expect.any(Function)
            );
        });

        it('uses a cached score instead of scoring the candidate again', async () => {
            const cachedHigh = { ...highScore, score: 99 };
            cacheService.readThrough.mockImplementation(
                async (key, _schema, _ttlInMs, loader) =>
                    key === 'RiskScore:user-high' ? cachedHigh : loader()
            );

            await service.riskScores(null, pagination);

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [cachedHigh, lowScore],
                pagination,
                AnalyticFraudRiskScoreAvailableOrderBy
            );
        });

        it('includes every score when minScore is null and sorts descending', async () => {
            const result = await service.riskScores(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [highScore, lowScore],
                pagination,
                AnalyticFraudRiskScoreAvailableOrderBy
            );
        });

        it('drops scores below minScore', async () => {
            await service.riskScores(30, pagination);

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [highScore],
                pagination,
                AnalyticFraudRiskScoreAvailableOrderBy
            );
        });

        it('pages whatever the sort util returns', async () => {
            analyticSortUtil.sortPage.mockReturnValue({
                data: [lowScore],
                total: 2,
            });

            await service.riskScores(null, { skip: 1, limit: 1, orderBy });

            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
                [lowScore],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('collectSignalUsers', () => {
        it('collects the users flagged by credential stuffing and by sign-up from a flagged ip', async () => {
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    [
                        '10.0.0.1',
                        { users: new Set(['user-1', 'user-2']), count: 2 },
                    ],
                    ['10.0.0.2', { users: new Set(['user-3']), count: 1 }],
                ])
            );

            const result = await service['collectSignalUsers']();

            expect(result.credentialStuffingIp).toEqual(
                new Set(['user-1', 'user-2'])
            );
        });
    });

    describe('groupFlaggedCredentialStuffing', () => {
        it('keeps ips at or above the unique-account minimum', async () => {
            const pairs = [
                { ipAddress: '10.0.0.1', userId: 'user-1', count: 2 },
                { ipAddress: '10.0.0.1', userId: 'user-2', count: 1 },
            ];
            const wide = { users: new Set(['user-1', 'user-2']), count: 3 };
            activityLogAnalyticService.getGroupIpUserByActions.mockResolvedValue(
                pairs
            );
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    ['10.0.0.1', wide],
                    ['10.0.0.2', { users: new Set(['user-3']), count: 1 }],
                ])
            );

            const result =
                await service['groupFlaggedCredentialStuffing'](86400000);

            expect(result).toEqual(new Map([['10.0.0.1', wide]]));
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                activityLogAnalyticService.getGroupIpUserByActions
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxMfaAttempt,
                ],
                startDate,
                now
            );
            expect(analyticAnomalyUtil.groupByIp).toHaveBeenCalledWith(pairs);
        });
    });

    describe('computeCredentialStuffing', () => {
        it('maps each flagged ip to its unique users and fail count', async () => {
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    [
                        '10.0.0.1',
                        { users: new Set(['user-1', 'user-2']), count: 3 },
                    ],
                    ['unknown', { users: new Set(['user-3']), count: 1 }],
                ])
            );

            const result = await service['computeCredentialStuffing'](86400000);

            expect(result).toEqual([
                { ipAddress: '10.0.0.1', uniqueUsers: 2, failCount: 3 },
            ]);
        });
    });

    describe('computeAccountTakeover', () => {
        it('flags a password change followed by a new device for the same user', async () => {
            passwordHistoryAnalyticService.getByTypeInRange.mockResolvedValue([
                {
                    id: 'change-1',
                    userId: 'user-1',
                    type: EnumPasswordHistoryType.profile,
                    createdAt: startDate,
                },
                {
                    id: 'change-2',
                    userId: 'user-2',
                    type: EnumPasswordHistoryType.profile,
                    createdAt: startDate,
                },
            ]);
            deviceAnalyticService.existsCreatedInRangeByUser
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const result = await service['computeAccountTakeover'](
                startDate,
                endDate
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    indicatorCodes: ['newDeviceAfterPasswordChange'],
                    passwordChangedAt: startDate,
                },
            ]);
            expect(
                deviceAnalyticService.existsCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-1', startDate, windowEnd);
            expect(
                deviceAnalyticService.existsCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-2', startDate, windowEnd);
            expect(
                passwordHistoryAnalyticService.getByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });
    });

    describe('computeMassRegistration', () => {
        it('buckets credential and social sign-up activity by ip at the min account count', async () => {
            const groups = [{ ipAddress: '10.0.0.1', count: 6 }];
            const buckets = [{ key: '10.0.0.1', count: 6 }];
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                groups
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service['computeMassRegistration'](86400000);

            expect(result).toBe(buckets);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                groups,
                'ipAddress'
            );
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                activityLogAnalyticService.getGroupIpByActions
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userSignedUp,
                    EnumActivityLogAction.userCreated,
                ],
                startDate,
                now,
                2
            );
        });
    });

    describe('collectMassRegistrationUsers', () => {
        it('returns no users when no ip is flagged', async () => {
            const result =
                await service['collectMassRegistrationUsers'](86400000);

            expect(result).toEqual(new Set());
            expect(
                activityLogAnalyticService.getGroupUserIdByIps
            ).not.toHaveBeenCalled();
        });

        it('collects the users of both sign-up actions registered from a flagged ip', async () => {
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue([
                { ipAddress: '10.0.0.1', count: 6 },
            ]);
            analyticBucketUtil.toBuckets.mockReturnValue([
                { key: '10.0.0.1', count: 6 },
            ]);
            activityLogAnalyticService.getGroupUserIdByIps.mockResolvedValue([
                'user-1',
                'user-2',
            ]);

            const result =
                await service['collectMassRegistrationUsers'](86400000);

            expect(result).toEqual(new Set(['user-1', 'user-2']));
            expect(
                activityLogAnalyticService.getGroupUserIdByIps
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userSignedUp,
                    EnumActivityLogAction.userCreated,
                ],
                startDate,
                now,
                ['10.0.0.1']
            );
        });
    });

    describe('computePasswordResetEnumeration', () => {
        it('buckets forgot-password activity by ip at the min request count', async () => {
            const groups = [{ ipAddress: '10.0.0.2', count: 11 }];
            const buckets = [{ key: '10.0.0.2', count: 11 }];
            activityLogAnalyticService.getGroupIpByActions.mockResolvedValue(
                groups
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result =
                await service['computePasswordResetEnumeration'](86400000);

            expect(result).toBe(buckets);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                groups,
                'ipAddress'
            );
            expect(
                activityLogAnalyticService.getGroupIpByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userForgotPassword],
                startDate,
                now,
                2
            );
        });
    });

    describe('computeSessionAfterAdmin', () => {
        it('flags a login for the same user inside the revoke window, reading the revokes page by page', async () => {
            const revokeActions = [
                EnumActivityLogAction.userRevokeSessionByAdmin,
                EnumActivityLogAction.userRevokeAllSessionsByAdmin,
            ];
            activityLogAnalyticService.getPageByActionsInRange
                .mockResolvedValueOnce({
                    ...emptyPage,
                    hasNext: true,
                    cursor: 'cursor-1',
                    data: [
                        {
                            id: 'rev-1',
                            userId: 'user-1',
                            action: EnumActivityLogAction.userRevokeSessionByAdmin,
                            ipAddress: null,
                            createdAt: startDate,
                            workspaceId: null,
                            userAgent: null,
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    ...emptyPage,
                    data: [
                        {
                            id: 'rev-2',
                            userId: 'user-2',
                            action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                            ipAddress: null,
                            createdAt: startDate,
                            workspaceId: null,
                            userAgent: null,
                        },
                    ],
                });
            activityLogAnalyticService.getOneByUserActionsInRange
                .mockResolvedValueOnce({
                    id: 'login-1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: null,
                    createdAt: windowEnd,
                    workspaceId: null,
                    userAgent: null,
                })
                .mockResolvedValueOnce(null);

            const result = await service['computeSessionAfterAdmin'](
                startDate,
                endDate
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    revokedAt: startDate,
                    loginAt: windowEnd,
                },
            ]);
            expect(
                activityLogAnalyticService.getPageByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                revokeActions,
                startDate,
                endDate,
                null
            );
            expect(
                activityLogAnalyticService.getPageByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                revokeActions,
                startDate,
                endDate,
                'cursor-1'
            );
            expect(
                activityLogAnalyticService.getOneByUserActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                'user-1',
                UserLoginAnalyticActions,
                startDate,
                windowEnd
            );
            expect(
                activityLogAnalyticService.getOneByUserActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                'user-2',
                UserLoginAnalyticActions,
                startDate,
                windowEnd
            );
        });
    });

    describe('computeForgotPasswordAbuse', () => {
        it('passes the unused-token minimum and maps every row it gets back', async () => {
            userForgotPasswordAnalyticService.getUnusedTokenCountsByUser.mockResolvedValue(
                [
                    { userId: 'user-1', count: 2 },
                    { userId: 'user-2', count: 1 },
                ]
            );

            const result =
                await service['computeForgotPasswordAbuse'](86400000);

            expect(result).toEqual([
                { userId: 'user-1', tokenCount: 2 },
                { userId: 'user-2', tokenCount: 1 },
            ]);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                userForgotPasswordAnalyticService.getUnusedTokenCountsByUser
            ).toHaveBeenCalledWith(startDate, now, 2);
        });
    });

    describe('computeRefreshSpike', () => {
        it('returns the users the database counts at or above the min count', async () => {
            const counted = [{ userId: 'user-1', count: 2 }];
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue(
                counted
            );

            const result = await service['computeRefreshSpike'](86400000);

            expect(result).toBe(counted);
            expect(
                activityLogAnalyticService.getGroupUserByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                now,
                2
            );
        });
    });

    describe('computeBackupCodeNewDevice', () => {
        it('flags a regeneration followed by a new device for the same user, reading the regenerations page by page', async () => {
            const regenerateActions = [
                EnumActivityLogAction.userRegenerateMfaBackupCodes,
            ];
            activityLogAnalyticService.getPageByActionsInRange
                .mockResolvedValueOnce({
                    ...emptyPage,
                    hasNext: true,
                    cursor: 'cursor-1',
                    data: [
                        {
                            id: 'regenerate-1',
                            userId: 'user-1',
                            action: EnumActivityLogAction.userRegenerateMfaBackupCodes,
                            ipAddress: null,
                            createdAt: startDate,
                            workspaceId: null,
                            userAgent: null,
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    ...emptyPage,
                    data: [
                        {
                            id: 'regenerate-2',
                            userId: 'user-2',
                            action: EnumActivityLogAction.userRegenerateMfaBackupCodes,
                            ipAddress: null,
                            createdAt: startDate,
                            workspaceId: null,
                            userAgent: null,
                        },
                    ],
                });
            deviceAnalyticService.existsCreatedInRangeByUser
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const result =
                await service['computeBackupCodeNewDevice'](86400000);

            expect(result).toEqual([
                { userId: 'user-1', regeneratedAt: startDate },
            ]);
            expect(
                activityLogAnalyticService.getPageByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                regenerateActions,
                startDate,
                now,
                null
            );
            expect(
                activityLogAnalyticService.getPageByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                regenerateActions,
                startDate,
                now,
                'cursor-1'
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                startDate,
                Duration.fromMillis(7200000)
            );
            expect(
                deviceAnalyticService.existsCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-2', startDate, windowEnd);
        });
    });

    describe('computeApiKeyBurst', () => {
        it('returns the users the database counts at or above the min count', async () => {
            const counted = [{ userId: 'user-1', count: 2 }];
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue(
                counted
            );

            const result = await service['computeApiKeyBurst'](86400000);

            expect(result).toBe(counted);
            expect(
                activityLogAnalyticService.getGroupUserByActions
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.adminApiKeyCreate,
                    EnumActivityLogAction.adminApiKeyReset,
                ],
                startDate,
                now,
                2
            );
        });
    });

    describe('scoreCached', () => {
        it('throws UserNotFoundException from the loader when the user is missing', async () => {
            userAnalyticService.getOneById.mockResolvedValue(null);

            await expect(
                service['scoreCached']('missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.notFound',
            });
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'RiskScore:missing',
                AnalyticFraudRiskScoreCacheSchema,
                riskScoreTtlInMs,
                expect.any(Function)
            );
            expect(
                deviceAnalyticService.getSharedFingerprints
            ).not.toHaveBeenCalled();
        });
    });

    describe('scoreListed', () => {
        it('scores the listed user in the loader', async () => {
            const user = {
                id: 'user-1',
                email: 'user@example.com',
                passwordAttempt: 0,
                passwordLockedUntil: null,
            };
            const signals: IAnalyticFraudSignalUsers = {
                ...emptySignals,
                impossibleTravel: new Set(['user-1']),
            };

            const result = await service['scoreListed'](user, signals);

            expect(result).toEqual({
                userId: 'user-1',
                score: 2,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.impossibleTravel,
                ],
            });
            expect(analyticCache.buildRiskScoreKey).toHaveBeenCalledWith(
                'user-1'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'RiskScore:user-1',
                AnalyticFraudRiskScoreCacheSchema,
                riskScoreTtlInMs,
                expect.any(Function)
            );
            expect(userAnalyticService.getOneById).not.toHaveBeenCalled();
        });
    });

    describe('resolveBand', () => {
        it('maps a score at or below each ceiling to its band', () => {
            expect(service['resolveBand'](0)).toBe(
                EnumAnalyticFraudBand.monitor
            );
            expect(service['resolveBand'](10)).toBe(
                EnumAnalyticFraudBand.monitor
            );
            expect(service['resolveBand'](11)).toBe(
                EnumAnalyticFraudBand.review
            );
            expect(service['resolveBand'](30)).toBe(
                EnumAnalyticFraudBand.review
            );
            expect(service['resolveBand'](31)).toBe(
                EnumAnalyticFraudBand.elevate
            );
            expect(service['resolveBand'](50)).toBe(
                EnumAnalyticFraudBand.elevate
            );
        });

        it('maps a score above the last ceiling to critical', () => {
            expect(service['resolveBand'](51)).toBe(
                EnumAnalyticFraudBand.critical
            );
        });
    });

    describe('score', () => {
        const user = {
            id: 'user-1',
            email: 'user@example.com',
            passwordAttempt: 0,
            passwordLockedUntil: null,
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

            const result = service['score'](
                { ...user, passwordAttempt: 4 },
                signals
            );

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

            expect(service['score'](user, signals)).toEqual({
                userId: 'user-1',
                score: 0,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [],
            });
        });

        it('flags near-lockout at the password max attempt minus the offset', () => {
            expect(
                service['score']({ ...user, passwordAttempt: 3 }, emptySignals)
                    .contributingSignalCodes
            ).toEqual([]);
            expect(
                service['score']({ ...user, passwordAttempt: 4 }, emptySignals)
                    .contributingSignalCodes
            ).toEqual([EnumAnalyticFraudContributingSignal.nearLockout]);
            expect(
                service['score'](user, emptySignals).contributingSignalCodes
            ).toEqual([]);
        });

        it('flags near-lockout for a zero-attempt user whose lock ends after now', () => {
            expect(
                service['score'](
                    {
                        ...user,
                        passwordAttempt: 0,
                        passwordLockedUntil: new Date(
                            '2026-03-01T00:10:00.000Z'
                        ),
                    },
                    emptySignals
                ).contributingSignalCodes
            ).toEqual([EnumAnalyticFraudContributingSignal.nearLockout]);
        });

        it('flags no near-lockout for a zero-attempt user whose lock ended before now', () => {
            expect(
                service['score'](
                    {
                        ...user,
                        passwordAttempt: 0,
                        passwordLockedUntil: new Date(
                            '2026-02-28T23:50:00.000Z'
                        ),
                    },
                    emptySignals
                ).contributingSignalCodes
            ).toEqual([]);
        });
    });

    describe('toSignalUsers', () => {
        const createdAt = new Date('2026-01-01T00:00:00.000Z');

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

            expect(service['toSignalUsers'](rows)).toEqual({
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
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
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

            expect(
                service['collectCandidateIds'](signals, nearLockout, 10)
            ).toEqual(['user-1', 'user-9', 'user-2']);
        });

        it('caps the union at the limit', () => {
            const signals: IAnalyticFraudSignalUsers = {
                ...emptySignals,
                sessionAfterAdmin: new Set(['user-1', 'user-2']),
                impossibleTravel: new Set(['user-3']),
            };

            expect(
                service['collectCandidateIds'](signals, nearLockout, 2)
            ).toEqual(['user-1', 'user-2']);
        });
    });
});
