import { chunk } from 'lodash-es';
import { Duration } from 'luxon';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
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
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
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
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('AnalyticFraudDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();
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
    const paginationService: MockProxy<PaginationService> =
        mock<PaginationService>();
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const analyticAnomalyDomain: MockProxy<AnalyticAnomalyDomain> =
        mock<AnalyticAnomalyDomain>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const passwordHistoryAnalyticDomain: MockProxy<PasswordHistoryAnalyticDomain> =
        mock<PasswordHistoryAnalyticDomain>();
    const userForgotPasswordAnalyticDomain: MockProxy<UserForgotPasswordAnalyticDomain> =
        mock<UserForgotPasswordAnalyticDomain>();
    const deviceAnalyticDomain: MockProxy<DeviceAnalyticDomain> =
        mock<DeviceAnalyticDomain>();

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
        'analytic.fraud.weights.sessionAfterAdmin': 10,
        'analytic.fraud.weights.impossibleTravel': 10,
        'analytic.fraud.weights.newDeviceAfterPasswordChange': 10,
        'analytic.fraud.weights.credentialStuffingIp': 10,
        'analytic.fraud.weights.sharedFingerprint': 10,
        'analytic.fraud.weights.nearLockout': 10,
        'analytic.fraud.weights.massRegistrationIp': 10,
        'analytic.fraud.weights.forgotPasswordAbuse': 10,
        'auth.password.maxAttempt': 5,
        'analytic.fraud.riskScore.candidateLimit': 3,
        'analytic.fraud.riskScore.lookbackInMs': 3600000,
    };

    const activityLogRow = {
        id: 'log-1',
        userId: 'user-1',
        action: EnumActivityLogAction.userLoginFailed,
        ipAddress: null,
        createdAt: startDate,
        workspaceId: null,
        userAgent: null,
    };

    let domain: AnalyticFraudDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperArrayService.chunk.mockImplementation((rows, size) =>
            chunk(rows, size)
        );
        configGet.mockImplementation((key: string) => configValues[key]);
        analyticCache.getFraudSummary.mockResolvedValue(null);
        analyticDateDomain.resolveWindow.mockImplementation(
            (windowMs, defaultInMs) => windowMs ?? defaultInMs
        );
        analyticCache.getRiskScore.mockResolvedValue(null);
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
        analyticFraudUtil.countByUser.mockReturnValue([]);
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);
        paginationService.offsetPage.mockReturnValue(offsetPage);
        activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue([]);
        activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);
        analyticAnomalyDomain.getImpossibleTravelUserIds.mockResolvedValue([]);
        passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue([]);
        userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser.mockResolvedValue(
            []
        );
        userAnalyticDomain.getNearLockout.mockResolvedValue([]);
        userAnalyticDomain.getManyByIds.mockResolvedValue([]);
        deviceAnalyticDomain.getSharedFingerprints.mockResolvedValue([]);
        deviceAnalyticDomain.getCreatedInRangeByUser.mockResolvedValue([]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                {
                    provide: AnalyticDateDomain,
                    useValue: analyticDateDomain,
                },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticSortUtil, useValue: analyticSortUtil },
                { provide: AnalyticFraudUtil, useValue: analyticFraudUtil },
                {
                    provide: AnalyticAnomalyUtil,
                    useValue: analyticAnomalyUtil,
                },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                { provide: PaginationService, useValue: paginationService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: AnalyticAnomalyDomain,
                    useValue: analyticAnomalyDomain,
                },
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
                { provide: UserAnalyticDomain, useValue: userAnalyticDomain },
                {
                    provide: PasswordHistoryAnalyticDomain,
                    useValue: passwordHistoryAnalyticDomain,
                },
                {
                    provide: UserForgotPasswordAnalyticDomain,
                    useValue: userForgotPasswordAnalyticDomain,
                },
                {
                    provide: DeviceAnalyticDomain,
                    useValue: deviceAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(AnalyticFraudDomain);
    });

    describe('credentialStuffingSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            const result = await domain.credentialStuffingSummary(null);

            expect(result).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.credentialStuffingSummary(600000);

            expect(result).toEqual({
                count: 0,
                window: '600000',
                meta: { minUniqueAccounts: 2 },
            });
            expect(analyticDateDomain.resolveWindow).toHaveBeenCalledWith(
                600000,
                86400000
            );
        });
    });

    describe('credentialStuffingList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.credentialStuffingList(
                null,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { ipAddress: '10.0.0.1', uniqueUsers: 4, failCount: 9 },
                { ipAddress: '10.0.0.2', uniqueUsers: 2, failCount: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.credentialStuffingList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('accountTakeoverSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: 'window-token' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            const result = await domain.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue(
                []
            );

            const result = await domain.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, window: 'window-token' });
        });
    });

    describe('accountTakeoverList', () => {
        it('chunks the profile changes by analytic.fraud.concurrency', async () => {
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue(
                []
            );

            await domain.accountTakeoverList(startDate, endDate, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue(
                []
            );

            const result = await domain.accountTakeoverList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue(
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

            await domain.accountTakeoverList(startDate, endDate, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('massRegistrationSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.massRegistrationSummary(null)).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);

            const result = await domain.massRegistrationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('massRegistrationList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);

            expect(await domain.massRegistrationList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.massRegistrationList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('passwordResetEnumerationSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.passwordResetEnumerationSummary(null)).toEqual(
                cached
            );
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);

            const result = await domain.passwordResetEnumerationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('passwordResetEnumerationList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);

            expect(
                await domain.passwordResetEnumerationList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([]);
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.passwordResetEnumerationList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('sharedFingerprintSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: null };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.sharedFingerprintSummary()).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            deviceAnalyticDomain.getSharedFingerprints.mockResolvedValue([]);

            const result = await domain.sharedFingerprintSummary();

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
            deviceAnalyticDomain.getSharedFingerprints.mockResolvedValue([row]);
            analyticSortUtil.sortPage.mockReturnValue({
                data: [row],
                total: 1,
            });

            const result = await domain.sharedFingerprintList({
                skip: 0,
                limit: 1,
                orderBy: [],
            });

            expect(result).toEqual(offsetPage);
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
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
            deviceAnalyticDomain.getSharedFingerprints.mockResolvedValue(rows);
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

            await domain.sharedFingerprintList({
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('sessionAfterAdminSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: 'window-token' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(
                await domain.sessionAfterAdminSummary(startDate, endDate)
            ).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.sessionAfterAdminSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, window: 'window-token' });
        });
    });

    describe('sessionAfterAdminList', () => {
        it('chunks the revokes by analytic.fraud.concurrency', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            await domain.sessionAfterAdminList(startDate, endDate, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(
                await domain.sessionAfterAdminList(
                    startDate,
                    endDate,
                    pagination
                )
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
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

            await domain.sessionAfterAdminList(startDate, endDate, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('forgotPasswordTokenAbuseSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.forgotPasswordTokenAbuseSummary(null)).toEqual(
                cached
            );
        });

        it('computes and caches the summary on a cache miss', async () => {
            userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser.mockResolvedValue(
                []
            );

            const result = await domain.forgotPasswordTokenAbuseSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('forgotPasswordTokenAbuseList', () => {
        it('pages computed rows', async () => {
            userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser.mockResolvedValue(
                []
            );

            expect(
                await domain.forgotPasswordTokenAbuseList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser.mockResolvedValue(
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

            await domain.forgotPasswordTokenAbuseList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('refreshSpikeSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.refreshSpikeSummary(null)).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.refreshSpikeSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('refreshSpikeList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(await domain.refreshSpikeList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.refreshSpikeList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('backupCodeNewDeviceSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.backupCodeNewDeviceSummary(null)).toEqual(
                cached
            );
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.backupCodeNewDeviceSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('backupCodeNewDeviceList', () => {
        it('chunks the regenerations by analytic.fraud.concurrency', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            await domain.backupCodeNewDeviceList(null, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith([], 10);
        });

        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(
                await domain.backupCodeNewDeviceList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', regeneratedAt: startDate },
                { userId: 'user-2', regeneratedAt: endDate },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.backupCodeNewDeviceList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('apiKeyBurstSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: '86400000' };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.apiKeyBurstSummary(null)).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.apiKeyBurstSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('apiKeyBurstList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(await domain.apiKeyBurstList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.apiKeyBurstList(null, {
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
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
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
        };
        const signals = {
            sessionAfterAdmin: new Set<string>(),
            impossibleTravel: new Set(['user-1']),
            newDeviceAfterPasswordChange: new Set<string>(),
            credentialStuffingIp: new Set<string>(),
            sharedFingerprint: new Set(['user-1']),
            massRegistrationIp: new Set<string>(),
            forgotPasswordAbuse: new Set<string>(),
        };
        const scored = {
            userId: 'user-1',
            score: 80,
            band: EnumAnalyticFraudBand.critical,
            contributingSignalCodes: [
                EnumAnalyticFraudContributingSignal.impossibleTravel,
            ],
        };

        it('returns the cached score on a cache hit', async () => {
            const cached = {
                userId: 'user-1',
                score: 10,
                band: EnumAnalyticFraudBand.monitor,
                contributingSignalCodes: [
                    EnumAnalyticFraudContributingSignal.nearLockout,
                ],
            };
            analyticCache.getRiskScore.mockResolvedValue(cached);

            const result = await domain.riskScore('user-1');

            expect(result).toEqual(cached);
            expect(userAnalyticDomain.getOneById).not.toHaveBeenCalled();
        });

        it('throws UserNotFoundException when the user is missing', async () => {
            userAnalyticDomain.getOneById.mockResolvedValue(null);

            await expect(domain.riskScore('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.notFound',
            });
            expect(
                deviceAnalyticDomain.getSharedFingerprints
            ).not.toHaveBeenCalled();
            expect(analyticFraudUtil.score).not.toHaveBeenCalled();
        });

        it('collects the signal users over the lookback window, scores the user, and caches the score', async () => {
            const shared = [
                {
                    fingerprint: 'fp-1',
                    userCount: 2,
                    userIds: ['user-1', 'user-9'],
                },
            ];
            userAnalyticDomain.getOneById.mockResolvedValue(user);
            analyticAnomalyDomain.getImpossibleTravelUserIds.mockResolvedValue([
                'user-1',
            ]);
            deviceAnalyticDomain.getSharedFingerprints.mockResolvedValue(
                shared
            );
            analyticFraudUtil.toSignalUsers.mockReturnValue(signals);
            analyticFraudUtil.score.mockReturnValue(scored);

            const result = await domain.riskScore('user-1');

            expect(result).toBe(scored);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                analyticAnomalyDomain.getImpossibleTravelUserIds
            ).toHaveBeenCalledWith(startDate, now);
            expect(analyticFraudUtil.toSignalUsers).toHaveBeenCalledWith({
                sessionAfterAdmin: [],
                impossibleTravelUserIds: ['user-1'],
                accountTakeover: [],
                credentialStuffingUserIds: new Set(),
                sharedFingerprint: shared,
                massRegistrationUserIds: new Set(),
                forgotPasswordAbuse: [],
            });
            expect(analyticFraudUtil.score).toHaveBeenCalledWith(user, signals);
            expect(analyticCache.setRiskScore).toHaveBeenCalledWith(
                'user-1',
                scored
            );
        });
    });

    describe('riskScores', () => {
        const signals = {
            sessionAfterAdmin: new Set<string>(),
            impossibleTravel: new Set<string>(),
            newDeviceAfterPasswordChange: new Set<string>(),
            credentialStuffingIp: new Set<string>(),
            sharedFingerprint: new Set(['user-high', 'user-low']),
            massRegistrationIp: new Set<string>(),
            forgotPasswordAbuse: new Set<string>(),
        };
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
        };
        const high = {
            id: 'user-high',
            email: 'high@example.com',
            passwordAttempt: 4,
        };
        const lowScore = {
            userId: 'user-low',
            score: 10,
            band: EnumAnalyticFraudBand.monitor,
            contributingSignalCodes: [],
        };
        const highScore = {
            userId: 'user-high',
            score: 40,
            band: EnumAnalyticFraudBand.elevate,
            contributingSignalCodes: [],
        };

        beforeEach(() => {
            analyticFraudUtil.toSignalUsers.mockReturnValue(signals);
            analyticFraudUtil.collectCandidateIds.mockReturnValue([
                'user-low',
                'user-high',
            ]);
            userAnalyticDomain.getNearLockout.mockResolvedValue(nearLockout);
            userAnalyticDomain.getManyByIds.mockResolvedValue([low, high]);
            analyticFraudUtil.score.mockImplementation(candidate =>
                candidate.id === 'user-high' ? highScore : lowScore
            );
        });

        it('reads the signal users once and picks the candidates through the fraud util', async () => {
            await domain.riskScores(null, pagination);

            expect(
                deviceAnalyticDomain.getSharedFingerprints
            ).toHaveBeenCalledTimes(1);
            expect(analyticFraudUtil.nearLockoutThreshold).toHaveBeenCalledWith(
                5
            );
            expect(userAnalyticDomain.getNearLockout).toHaveBeenCalledWith(
                4,
                3
            );
            expect(analyticFraudUtil.collectCandidateIds).toHaveBeenCalledWith(
                signals,
                nearLockout,
                3
            );
            expect(userAnalyticDomain.getManyByIds).toHaveBeenCalledWith([
                'user-low',
                'user-high',
            ]);
        });

        it('scores the candidates in chunks of analytic.fraud.concurrency', async () => {
            await domain.riskScores(null, pagination);

            expect(helperArrayService.chunk).toHaveBeenCalledWith(
                [low, high],
                10
            );
            expect(analyticFraudUtil.score).toHaveBeenCalledWith(low, signals);
            expect(analyticFraudUtil.score).toHaveBeenCalledWith(high, signals);
            expect(analyticCache.setRiskScore).toHaveBeenCalledWith(
                'user-low',
                lowScore
            );
            expect(analyticCache.setRiskScore).toHaveBeenCalledWith(
                'user-high',
                highScore
            );
        });

        it('uses a cached score instead of scoring the candidate again', async () => {
            analyticCache.getRiskScore.mockImplementation(async userId =>
                userId === 'user-high' ? highScore : null
            );

            await domain.riskScores(null, pagination);

            expect(analyticFraudUtil.score).toHaveBeenCalledTimes(1);
            expect(analyticFraudUtil.score).toHaveBeenCalledWith(low, signals);
        });

        it('includes every score when minScore is null and sorts descending', async () => {
            const result = await domain.riskScores(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [highScore, lowScore],
                pagination,
                AnalyticFraudRiskScoreAvailableOrderBy
            );
        });

        it('drops scores below minScore', async () => {
            await domain.riskScores(30, pagination);

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

            await domain.riskScores(null, { skip: 1, limit: 1, orderBy });

            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [lowScore],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('collectSignalUsers', () => {
        it('collects the users flagged by credential stuffing and by sign-up from a flagged ip', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    [
                        '10.0.0.1',
                        { users: new Set(['user-1', 'user-2']), count: 2 },
                    ],
                    ['10.0.0.2', { users: new Set(['user-3']), count: 1 }],
                ])
            );
            analyticFraudUtil.toSignalUsers.mockImplementation(rows => ({
                sessionAfterAdmin: new Set(),
                impossibleTravel: new Set(),
                newDeviceAfterPasswordChange: new Set(),
                credentialStuffingIp: rows.credentialStuffingUserIds,
                sharedFingerprint: new Set(),
                massRegistrationIp: new Set(),
                forgotPasswordAbuse: new Set(),
            }));

            const result = await domain['collectSignalUsers']();

            expect(result.credentialStuffingIp).toEqual(
                new Set(['user-1', 'user-2'])
            );
        });
    });

    describe('groupFlaggedCredentialStuffing', () => {
        it('keeps ips at or above the unique-account minimum', async () => {
            const logs = [
                {
                    ...activityLogRow,
                    ipAddress: '10.0.0.1',
                },
            ];
            const wide = { users: new Set(['user-1', 'user-2']), count: 3 };
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                logs
            );
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    ['10.0.0.1', wide],
                    ['10.0.0.2', { users: new Set(['user-3']), count: 1 }],
                ])
            );

            const result =
                await domain['groupFlaggedCredentialStuffing'](86400000);

            expect(result).toEqual(new Map([['10.0.0.1', wide]]));
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                ],
                startDate,
                now
            );
            expect(analyticAnomalyUtil.groupByIp).toHaveBeenCalledWith(logs);
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

            const result = await domain['computeCredentialStuffing'](86400000);

            expect(result).toEqual([
                { ipAddress: '10.0.0.1', uniqueUsers: 2, failCount: 3 },
            ]);
        });
    });

    describe('computeAccountTakeover', () => {
        it('flags a password change followed by a new device for the same user', async () => {
            passwordHistoryAnalyticDomain.getByTypeInRange.mockResolvedValue([
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
            deviceAnalyticDomain.getCreatedInRangeByUser
                .mockResolvedValueOnce([
                    {
                        id: 'own-1',
                        userId: 'user-1',
                        deviceId: 'device-1',
                        createdAt: windowEnd,
                    },
                ])
                .mockResolvedValueOnce([]);

            const result = await domain['computeAccountTakeover'](
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
                deviceAnalyticDomain.getCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-1', startDate, windowEnd);
            expect(
                deviceAnalyticDomain.getCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-2', startDate, windowEnd);
            expect(
                passwordHistoryAnalyticDomain.getByTypeInRange
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
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue(
                groups
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain['computeMassRegistration'](86400000);

            expect(result).toBe(buckets);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                groups,
                'ipAddress'
            );
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
            expect(
                activityLogAnalyticDomain.getGroupIpByActions
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
                await domain['collectMassRegistrationUsers'](86400000);

            expect(result).toEqual(new Set());
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).not.toHaveBeenCalled();
        });

        it('collects the users of both sign-up actions registered from a flagged ip', async () => {
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue([
                { ipAddress: '10.0.0.1', count: 6 },
            ]);
            analyticBucketUtil.toBuckets.mockReturnValue([
                { key: '10.0.0.1', count: 6 },
            ]);
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                [
                    {
                        ...activityLogRow,
                        userId: 'user-1',
                        action: EnumActivityLogAction.userSignedUp,
                        ipAddress: '10.0.0.1',
                    },
                    {
                        ...activityLogRow,
                        userId: 'user-2',
                        action: EnumActivityLogAction.userCreated,
                        ipAddress: '10.0.0.1',
                    },
                    {
                        ...activityLogRow,
                        userId: 'user-3',
                        action: EnumActivityLogAction.userSignedUp,
                        ipAddress: '10.0.0.7',
                    },
                    {
                        ...activityLogRow,
                        userId: 'user-4',
                        action: EnumActivityLogAction.userSignedUp,
                        ipAddress: null,
                    },
                ]
            );

            const result =
                await domain['collectMassRegistrationUsers'](86400000);

            expect(result).toEqual(new Set(['user-1', 'user-2']));
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userSignedUp,
                    EnumActivityLogAction.userCreated,
                ],
                startDate,
                now
            );
        });
    });

    describe('computePasswordResetEnumeration', () => {
        it('buckets forgot-password activity by ip at the min request count', async () => {
            const groups = [{ ipAddress: '10.0.0.2', count: 11 }];
            const buckets = [{ key: '10.0.0.2', count: 11 }];
            activityLogAnalyticDomain.getGroupIpByActions.mockResolvedValue(
                groups
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result =
                await domain['computePasswordResetEnumeration'](86400000);

            expect(result).toBe(buckets);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                groups,
                'ipAddress'
            );
            expect(
                activityLogAnalyticDomain.getGroupIpByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userForgotPassword],
                startDate,
                now,
                2
            );
        });
    });

    describe('computeSessionAfterAdmin', () => {
        it('flags a login for the same user inside the revoke window', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange
                .mockResolvedValueOnce([
                    {
                        id: 'rev-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRevokeSessionByAdmin,
                        ipAddress: null,
                        createdAt: startDate,
                        workspaceId: null,
                        userAgent: null,
                    },
                    {
                        id: 'rev-2',
                        userId: 'user-2',
                        action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        ipAddress: null,
                        createdAt: startDate,
                        workspaceId: null,
                        userAgent: null,
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        id: 'login-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userLoginCredential,
                        ipAddress: null,
                        createdAt: windowEnd,
                        workspaceId: null,
                        userAgent: null,
                    },
                ])
                .mockResolvedValueOnce([]);

            const result = await domain['computeSessionAfterAdmin'](
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
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                UserLoginAnalyticActions,
                startDate,
                windowEnd
            );
        });
    });

    describe('computeForgotPasswordAbuse', () => {
        it('keeps users at or above the unused-token minimum', async () => {
            userForgotPasswordAnalyticDomain.getUnusedTokenCountsByUser.mockResolvedValue(
                [
                    { userId: 'user-1', count: 2 },
                    { userId: 'user-2', count: 1 },
                ]
            );

            const result = await domain['computeForgotPasswordAbuse'](86400000);

            expect(result).toEqual([{ userId: 'user-1', tokenCount: 2 }]);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(86400000);
        });
    });

    describe('computeRefreshSpike', () => {
        it('returns the users the fraud util counts at or above the min count', async () => {
            const logs = [{ ...activityLogRow }];
            const counted = [{ userId: 'user-1', count: 2 }];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                logs
            );
            analyticFraudUtil.countByUser.mockReturnValue(counted);

            const result = await domain['computeRefreshSpike'](86400000);

            expect(result).toBe(counted);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                now
            );
            expect(analyticFraudUtil.countByUser).toHaveBeenCalledWith(logs, 2);
        });
    });

    describe('computeBackupCodeNewDevice', () => {
        it('flags a regeneration followed by a new device for the same user', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                [
                    {
                        id: 'regenerate-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                        ipAddress: null,
                        createdAt: startDate,
                        workspaceId: null,
                        userAgent: null,
                    },
                    {
                        id: 'regenerate-2',
                        userId: 'user-2',
                        action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                        ipAddress: null,
                        createdAt: startDate,
                        workspaceId: null,
                        userAgent: null,
                    },
                ]
            );
            deviceAnalyticDomain.getCreatedInRangeByUser
                .mockResolvedValueOnce([
                    {
                        id: 'own-1',
                        userId: 'user-1',
                        deviceId: 'device-1',
                        createdAt: windowEnd,
                    },
                ])
                .mockResolvedValueOnce([]);

            const result = await domain['computeBackupCodeNewDevice'](86400000);

            expect(result).toEqual([
                { userId: 'user-1', regeneratedAt: startDate },
            ]);
            expect(helperDateService.forward).toHaveBeenCalledWith(
                startDate,
                Duration.fromMillis(7200000)
            );
            expect(
                deviceAnalyticDomain.getCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-2', startDate, windowEnd);
        });
    });

    describe('computeApiKeyBurst', () => {
        it('returns the users the fraud util counts at or above the min count', async () => {
            const logs = [
                {
                    ...activityLogRow,
                    action: EnumActivityLogAction.adminApiKeyCreate,
                },
            ];
            const counted = [{ userId: 'user-1', count: 2 }];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                logs
            );
            analyticFraudUtil.countByUser.mockReturnValue(counted);

            const result = await domain['computeApiKeyBurst'](86400000);

            expect(result).toBe(counted);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.adminApiKeyCreate,
                    EnumActivityLogAction.adminApiKeyReset,
                ],
                startDate,
                now
            );
            expect(analyticFraudUtil.countByUser).toHaveBeenCalledWith(logs, 2);
        });
    });
});
