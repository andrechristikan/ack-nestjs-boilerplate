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
    EnumUserSignUpFrom,
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
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('AnalyticFraudDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticSortUtil: MockProxy<AnalyticSortUtil> =
        mock<AnalyticSortUtil>();
    const paginationService: MockProxy<PaginationService> =
        mock<PaginationService>();
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();
    const userLoginAnalyticDomain: MockProxy<UserLoginAnalyticDomain> =
        mock<UserLoginAnalyticDomain>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const userPasswordAnalyticDomain: MockProxy<UserPasswordAnalyticDomain> =
        mock<UserPasswordAnalyticDomain>();
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
        'analytic.fraud.refreshSpike.minEvents': 2,
        'analytic.fraud.backupCodeNewDevice.windowInMs': 86400000,
        'analytic.fraud.apiKeyBurst.windowInMs': 86400000,
        'analytic.fraud.apiKeyBurst.minEvents': 2,
        'analytic.fraud.bands.monitorMax': 10,
        'analytic.fraud.bands.reviewMax': 30,
        'analytic.fraud.bands.elevateMax': 50,
        'analytic.fraud.bandLabels.monitor': 'monitor',
        'analytic.fraud.bandLabels.review': 'review',
        'analytic.fraud.bandLabels.elevate': 'elevate',
        'analytic.fraud.bandLabels.critical': 'critical',
        'analytic.fraud.weights.sessionAfterAdmin': 10,
        'analytic.fraud.weights.impossibleTravel': 10,
        'analytic.fraud.weights.newDeviceAfterPasswordChange': 10,
        'analytic.fraud.weights.credentialStuffingIp': 10,
        'analytic.fraud.weights.sharedFingerprint': 10,
        'analytic.fraud.weights.nearLockout': 10,
        'analytic.fraud.weights.massRegistrationIp': 10,
        'analytic.fraud.weights.forgotPasswordAbuse': 10,
        'auth.password.maxAttempt': 5,
        'analytic.anomaly.failedLoginSpike.nearLockoutOffset': 1,
    };

    let domain: AnalyticFraudDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => configValues[key]);
        analyticCache.getFraudSummary.mockResolvedValue(null);
        analyticCache.getRiskScore.mockResolvedValue(null);
        analyticDateUtil.windowToken.mockReturnValue('window-token');
        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(startDate);
        helperDateService.forward.mockReturnValue(windowEnd);
        analyticSortUtil.sortRows.mockImplementation(rows => rows);
        paginationService.offsetPage.mockReturnValue(offsetPage);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticSortUtil, useValue: analyticSortUtil },
                { provide: PaginationService, useValue: paginationService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
                {
                    provide: UserLoginAnalyticDomain,
                    useValue: userLoginAnalyticDomain,
                },
                { provide: UserAnalyticDomain, useValue: userAnalyticDomain },
                {
                    provide: UserPasswordAnalyticDomain,
                    useValue: userPasswordAnalyticDomain,
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
            userLoginAnalyticDomain.findFailedLoginEvents.mockResolvedValue([]);

            const result = await domain.credentialStuffingSummary(600000);

            expect(result).toEqual({
                count: 0,
                window: '600000',
                meta: { minUniqueAccounts: 2 },
            });
        });
    });

    describe('credentialStuffingList', () => {
        it('pages computed rows', async () => {
            userLoginAnalyticDomain.findFailedLoginEvents.mockResolvedValue([]);

            const result = await domain.credentialStuffingList(
                null,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('sorts the computed rows before it slices the page', async () => {
            userLoginAnalyticDomain.findFailedLoginEvents.mockResolvedValue([]);
            const sorted = [
                { ipAddress: '10.0.0.1', uniqueUsers: 4, failCount: 9 },
                { ipAddress: '10.0.0.2', uniqueUsers: 2, failCount: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.credentialStuffingList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            userPasswordAnalyticDomain.findProfileChanges.mockResolvedValue([]);

            const result = await domain.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, window: 'window-token' });
        });
    });

    describe('accountTakeoverList', () => {
        it('pages computed rows', async () => {
            userPasswordAnalyticDomain.findProfileChanges.mockResolvedValue([]);

            const result = await domain.accountTakeoverList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });

        it('sorts the computed rows before it slices the page', async () => {
            userPasswordAnalyticDomain.findProfileChanges.mockResolvedValue([]);
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
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.accountTakeoverList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            userAnalyticDomain.findSignUpsInRange.mockResolvedValue([]);

            const result = await domain.massRegistrationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('massRegistrationList', () => {
        it('pages computed rows', async () => {
            userAnalyticDomain.findSignUpsInRange.mockResolvedValue([]);

            expect(await domain.massRegistrationList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('sorts the computed rows before it slices the page', async () => {
            userAnalyticDomain.findSignUpsInRange.mockResolvedValue([]);
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.massRegistrationList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            userForgotPasswordAnalyticDomain.findCreatedInRange.mockResolvedValue(
                []
            );

            const result = await domain.passwordResetEnumerationSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('passwordResetEnumerationList', () => {
        it('pages computed rows', async () => {
            userForgotPasswordAnalyticDomain.findCreatedInRange.mockResolvedValue(
                []
            );

            expect(
                await domain.passwordResetEnumerationList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('sorts the computed rows before it slices the page', async () => {
            userForgotPasswordAnalyticDomain.findCreatedInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { key: '10.0.0.1', count: 9 },
                { key: '10.0.0.2', count: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.passwordResetEnumerationList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            const cached = { count: 1 };
            analyticCache.getFraudSummary.mockResolvedValue(cached);

            expect(await domain.sharedFingerprintSummary()).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            deviceAnalyticDomain.sharedFingerprints.mockResolvedValue([]);

            const result = await domain.sharedFingerprintSummary();

            expect(result).toEqual({ count: 0 });
        });
    });

    describe('sharedFingerprintList', () => {
        it('pages shared fingerprint rows', async () => {
            deviceAnalyticDomain.sharedFingerprints.mockResolvedValue([
                {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
            ]);

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

        it('sorts the computed rows before it slices the page', async () => {
            const rows = [
                {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
            ];
            deviceAnalyticDomain.sharedFingerprints.mockResolvedValue(rows);
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
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.sharedFingerprintList({
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                rows,
                orderBy,
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
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
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
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
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

        it('sorts the computed rows before it slices the page', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
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
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.sessionAfterAdminList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            userForgotPasswordAnalyticDomain.unusedTokenCountsByUser.mockResolvedValue(
                []
            );

            const result = await domain.forgotPasswordTokenAbuseSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('forgotPasswordTokenAbuseList', () => {
        it('pages computed rows', async () => {
            userForgotPasswordAnalyticDomain.unusedTokenCountsByUser.mockResolvedValue(
                []
            );

            expect(
                await domain.forgotPasswordTokenAbuseList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('sorts the computed rows before it slices the page', async () => {
            userForgotPasswordAnalyticDomain.unusedTokenCountsByUser.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', tokenCount: 9 },
                { userId: 'user-2', tokenCount: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.forgotPasswordTokenAbuseList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.refreshSpikeSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('refreshSpikeList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(await domain.refreshSpikeList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('sorts the computed rows before it slices the page', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.refreshSpikeList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.backupCodeNewDeviceSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('backupCodeNewDeviceList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(
                await domain.backupCodeNewDeviceList(null, pagination)
            ).toEqual(offsetPage);
        });

        it('sorts the computed rows before it slices the page', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', regeneratedAt: startDate },
                { userId: 'user-2', regeneratedAt: endDate },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.backupCodeNewDeviceList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.apiKeyBurstSummary(null);

            expect(result).toEqual({ count: 0, window: '86400000' });
        });
    });

    describe('apiKeyBurstList', () => {
        it('pages computed rows', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );

            expect(await domain.apiKeyBurstList(null, pagination)).toEqual(
                offsetPage
            );
        });

        it('sorts the computed rows before it slices the page', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { userId: 'user-1', count: 9 },
                { userId: 'user-2', count: 5 },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.apiKeyBurstList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
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
        it('returns the cached score on a cache hit', async () => {
            const cached = {
                userId: 'user-1',
                score: 10,
                band: 'monitor',
                contributingSignalCodes: ['nearLockout'],
            };
            analyticCache.getRiskScore.mockResolvedValue(cached);

            const result = await domain.riskScore('user-1');

            expect(result).toEqual(cached);
            expect(userAnalyticDomain.findOneById).not.toHaveBeenCalled();
        });

        it('throws UserNotFoundException when the user is missing', async () => {
            userAnalyticDomain.findOneById.mockResolvedValue(null);

            await expect(domain.riskScore('missing')).rejects.toThrow(
                UserNotFoundException
            );
            await expect(domain.riskScore('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.notFound',
            });
        });

        it('scores near-lockout and a shared fingerprint', async () => {
            userAnalyticDomain.findOneById.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                passwordAttempt: 4,
            });
            deviceAnalyticDomain.sharedFingerprints.mockResolvedValue([
                {
                    fingerprint: 'fp-1',
                    userCount: 2,
                    userIds: ['user-1', 'user-2'],
                },
            ]);

            const result = await domain.riskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 20,
                band: 'review',
                contributingSignalCodes: ['nearLockout', 'sharedFingerprint'],
            });
            expect(analyticCache.setRiskScore).toHaveBeenCalledWith(
                'user-1',
                result
            );
        });

        it('treats a null passwordAttempt as zero and skips unmatched fingerprints', async () => {
            userAnalyticDomain.findOneById.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                passwordAttempt: null,
            });
            deviceAnalyticDomain.sharedFingerprints.mockResolvedValue([
                {
                    fingerprint: 'fp-1',
                    userCount: 2,
                    userIds: ['user-2', 'user-3'],
                },
            ]);

            const result = await domain.riskScore('user-1');

            expect(result).toEqual({
                userId: 'user-1',
                score: 0,
                band: 'monitor',
                contributingSignalCodes: [],
            });
        });
    });

    describe('riskScores', () => {
        it('includes every score when minScore is null and sorts descending', async () => {
            userAnalyticDomain.findNearLockout.mockResolvedValue([
                {
                    id: 'user-low',
                    email: 'low@example.com',
                    passwordAttempt: 1,
                    lastLoginAt: startDate,
                    createdAt: startDate,
                },
                {
                    id: 'user-high',
                    email: 'high@example.com',
                    passwordAttempt: 4,
                    lastLoginAt: startDate,
                    createdAt: startDate,
                },
            ]);
            analyticCache.getRiskScore.mockImplementation(async userId => ({
                userId,
                score: userId === 'user-high' ? 40 : 10,
                band: 'monitor',
                contributingSignalCodes: [],
            }));

            const result = await domain.riskScores(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [
                    {
                        userId: 'user-high',
                        score: 40,
                        band: 'monitor',
                        contributingSignalCodes: [],
                    },
                    {
                        userId: 'user-low',
                        score: 10,
                        band: 'monitor',
                        contributingSignalCodes: [],
                    },
                ],
                [],
                AnalyticFraudRiskScoreAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [
                    {
                        userId: 'user-high',
                        score: 40,
                        band: 'monitor',
                        contributingSignalCodes: [],
                    },
                    {
                        userId: 'user-low',
                        score: 10,
                        band: 'monitor',
                        contributingSignalCodes: [],
                    },
                ],
                2,
                { skip: 0, limit: 20 }
            );
        });

        it('pages whatever the sorter returns rather than the scored order', async () => {
            userAnalyticDomain.findNearLockout.mockResolvedValue([]);
            const sorted = [
                {
                    userId: 'user-a',
                    score: 10,
                    band: 'monitor',
                    contributingSignalCodes: [],
                },
                {
                    userId: 'user-b',
                    score: 40,
                    band: 'elevate',
                    contributingSignalCodes: [],
                },
            ];
            analyticSortUtil.sortRows.mockReturnValue(sorted);

            await domain.riskScores(null, { skip: 1, limit: 1, orderBy });

            expect(analyticSortUtil.sortRows).toHaveBeenCalledWith(
                [],
                orderBy,
                AnalyticFraudRiskScoreAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });

        it('drops scores below minScore', async () => {
            userAnalyticDomain.findNearLockout.mockResolvedValue([
                {
                    id: 'user-low',
                    email: 'low@example.com',
                    passwordAttempt: 1,
                    lastLoginAt: startDate,
                    createdAt: startDate,
                },
                {
                    id: 'user-high',
                    email: 'high@example.com',
                    passwordAttempt: 4,
                    lastLoginAt: startDate,
                    createdAt: startDate,
                },
            ]);
            analyticCache.getRiskScore.mockImplementation(async userId => ({
                userId,
                score: userId === 'user-high' ? 40 : 10,
                band: 'monitor',
                contributingSignalCodes: [],
            }));

            await domain.riskScores(30, pagination);

            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [
                    {
                        userId: 'user-high',
                        score: 40,
                        band: 'monitor',
                        contributingSignalCodes: [],
                    },
                ],
                1,
                { skip: 0, limit: 20 }
            );
        });
    });

    describe('resolveWindow', () => {
        it('returns a truthy supplied window', () => {
            expect(
                domain['resolveWindow'](
                    600000,
                    'analytic.fraud.credentialStuffing.windowInMs'
                )
            ).toBe(600000);
        });

        it('reads the config key when windowMs is absent', () => {
            expect(
                domain['resolveWindow'](
                    null,
                    'analytic.fraud.credentialStuffing.windowInMs'
                )
            ).toBe(86400000);
        });
    });

    describe('resolveBand', () => {
        it('returns monitor at or below monitorMax', () => {
            expect(domain['resolveBand'](0)).toBe('monitor');
            expect(domain['resolveBand'](10)).toBe('monitor');
        });

        it('returns review above monitorMax through reviewMax', () => {
            expect(domain['resolveBand'](11)).toBe('review');
            expect(domain['resolveBand'](30)).toBe('review');
        });

        it('returns elevate above reviewMax through elevateMax', () => {
            expect(domain['resolveBand'](31)).toBe('elevate');
            expect(domain['resolveBand'](50)).toBe('elevate');
        });

        it('returns critical above elevateMax', () => {
            expect(domain['resolveBand'](51)).toBe('critical');
        });
    });

    describe('computeCredentialStuffing', () => {
        it('groups unique users per ip and treats a missing ip as unknown', async () => {
            userLoginAnalyticDomain.findFailedLoginEvents.mockResolvedValue([
                {
                    id: 'e1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginFailed,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                },
                {
                    id: 'e2',
                    userId: 'user-2',
                    action: EnumActivityLogAction.userLoginFailed,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                },
                {
                    id: 'e3',
                    userId: 'user-3',
                    action: EnumActivityLogAction.userLoginFailed,
                    ipAddress: null,
                    createdAt: startDate,
                },
            ]);

            const result = await domain['computeCredentialStuffing'](86400000);

            expect(result).toEqual([
                { ipAddress: '10.0.0.1', uniqueUsers: 2, failCount: 2 },
            ]);
        });
    });

    describe('computeAccountTakeover', () => {
        it('flags a password change followed by a new device for the same user', async () => {
            userPasswordAnalyticDomain.findProfileChanges.mockResolvedValue([
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
            deviceAnalyticDomain.findCreatedInRange
                .mockResolvedValueOnce([
                    {
                        id: 'own-1',
                        userId: 'user-1',
                        deviceId: 'device-1',
                        createdAt: windowEnd,
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        id: 'own-2',
                        userId: 'user-3',
                        deviceId: 'device-2',
                        createdAt: windowEnd,
                    },
                ]);

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
        });
    });

    describe('computeMassRegistration', () => {
        it('keeps sign-up sources that meet the min account count', async () => {
            userAnalyticDomain.findSignUpsInRange.mockResolvedValue([
                {
                    id: 'u1',
                    email: 'a@example.com',
                    signUpAt: startDate,
                    signUpFrom: EnumUserSignUpFrom.website,
                },
                {
                    id: 'u2',
                    email: 'b@example.com',
                    signUpAt: startDate,
                    signUpFrom: EnumUserSignUpFrom.website,
                },
                {
                    id: 'u3',
                    email: 'c@example.com',
                    signUpAt: startDate,
                    signUpFrom: EnumUserSignUpFrom.mobile,
                },
            ]);

            const result = await domain['computeMassRegistration'](86400000);

            expect(result).toEqual([
                { key: String(EnumUserSignUpFrom.website), count: 2 },
            ]);
        });
    });

    describe('computePasswordResetEnumeration', () => {
        it('groups by email domain and falls back to the raw destination', async () => {
            userForgotPasswordAnalyticDomain.findCreatedInRange.mockResolvedValue(
                [
                    {
                        id: 'fp-1',
                        userId: 'user-1',
                        isUsed: false,
                        createdAt: startDate,
                        to: 'a@example.com',
                    },
                    {
                        id: 'fp-2',
                        userId: 'user-2',
                        isUsed: false,
                        createdAt: startDate,
                        to: 'b@example.com',
                    },
                    {
                        id: 'fp-3',
                        userId: 'user-3',
                        isUsed: false,
                        createdAt: startDate,
                        to: 'not-an-email',
                    },
                ]
            );

            const result =
                await domain['computePasswordResetEnumeration'](86400000);

            expect(result).toEqual([{ key: 'example.com', count: 2 }]);
        });
    });

    describe('computeSessionAfterAdmin', () => {
        it('flags a login for the same user inside the revoke window', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                [
                    {
                        id: 'rev-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRevokeSessionByAdmin,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'rev-2',
                        userId: 'user-2',
                        action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                ]
            );
            userLoginAnalyticDomain.findLoginEvents
                .mockResolvedValueOnce([
                    {
                        id: 'login-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userLoginCredential,
                        ipAddress: null,
                        createdAt: windowEnd,
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
        });
    });

    describe('computeForgotPasswordAbuse', () => {
        it('keeps users at or above the unused-token minimum', async () => {
            userForgotPasswordAnalyticDomain.unusedTokenCountsByUser.mockResolvedValue(
                [
                    { userId: 'user-1', count: 2 },
                    { userId: 'user-2', count: 1 },
                ]
            );

            const result = await domain['computeForgotPasswordAbuse'](86400000);

            expect(result).toEqual([{ userId: 'user-1', tokenCount: 2 }]);
        });
    });

    describe('computeRefreshSpike', () => {
        it('keeps users at or above the min event count', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                [
                    {
                        id: 'r1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRefreshToken,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'r2',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRefreshToken,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'r3',
                        userId: 'user-2',
                        action: EnumActivityLogAction.userRefreshToken,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                ]
            );

            const result = await domain['computeRefreshSpike'](86400000);

            expect(result).toEqual([{ userId: 'user-1', count: 2 }]);
        });
    });

    describe('computeBackupCodeNewDevice', () => {
        it('flags a regeneration followed by a new device for the same user', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                [
                    {
                        id: 'regen-1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'regen-2',
                        userId: 'user-2',
                        action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                ]
            );
            deviceAnalyticDomain.findCreatedInRange
                .mockResolvedValueOnce([
                    {
                        id: 'own-1',
                        userId: 'user-1',
                        deviceId: 'device-1',
                        createdAt: windowEnd,
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        id: 'own-2',
                        userId: 'user-3',
                        deviceId: 'device-2',
                        createdAt: windowEnd,
                    },
                ]);

            const result = await domain['computeBackupCodeNewDevice'](86400000);

            expect(result).toEqual([
                { userId: 'user-1', regeneratedAt: startDate },
            ]);
        });
    });

    describe('computeApiKeyBurst', () => {
        it('keeps users at or above the min event count', async () => {
            activityLogAnalyticDomain.findManyByActionsInRange.mockResolvedValue(
                [
                    {
                        id: 'k1',
                        userId: 'user-1',
                        action: EnumActivityLogAction.adminApiKeyCreate,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'k2',
                        userId: 'user-1',
                        action: EnumActivityLogAction.adminApiKeyReset,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                    {
                        id: 'k3',
                        userId: 'user-2',
                        action: EnumActivityLogAction.adminApiKeyCreate,
                        ipAddress: null,
                        createdAt: startDate,
                    },
                ]
            );

            const result = await domain['computeApiKeyBurst'](86400000);

            expect(result).toEqual([{ userId: 'user-1', count: 2 }]);
        });
    });
});
