import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import {
    AnalyticCredentialStuffingActions,
    AnalyticMassRegistrationActions,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticFraudRepository } from '@modules/analytic/interfaces/analytic.fraud-repository.interface';
import type {
    IAnalyticAccountTakeover,
    IAnalyticCredentialStuffing,
    IAnalyticDateRange,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudRiskScore,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticRiskScoreOptions,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
    IAnalyticSnapshotItemInput,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';
import { AnalyticAccountTakeoverPipelineSchema } from '@modules/analytic/dtos/analytic.account-takeover-pipeline.dto';
import { AnalyticCredentialStuffingPipelineSchema } from '@modules/analytic/dtos/analytic.credential-stuffing-pipeline.dto';
import { AnalyticForgotPasswordAbusePipelineSchema } from '@modules/analytic/dtos/analytic.forgot-password-abuse-pipeline.dto';
import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';
import { AnalyticKeyCountPipelineSchema } from '@modules/analytic/dtos/analytic.key-count-pipeline.dto';
import { AnalyticRiskScorePipelineSchema } from '@modules/analytic/dtos/analytic.risk-score-pipeline.dto';
import { AnalyticSessionAfterAdminPipelineSchema } from '@modules/analytic/dtos/analytic.session-after-admin-pipeline.dto';
import { AnalyticSharedFingerprintPipelineSchema } from '@modules/analytic/dtos/analytic.shared-fingerprint-pipeline.dto';

@Injectable()
export class AnalyticFraudRepository implements IAnalyticFraudRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private newDeviceLookupStage(windowInMs: number): Prisma.InputJsonValue {
        return {
            $lookup: {
                from: 'DeviceOwnerships',
                localField: 'userId',
                foreignField: 'userId',
                let: { changedAt: '$createdAt' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $gte: ['$createdAt', '$$changedAt'] },
                                    {
                                        $lt: [
                                            '$createdAt',
                                            {
                                                $add: [
                                                    '$$changedAt',
                                                    windowInMs,
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } },
                ],
                as: 'hit',
            },
        };
    }

    private credentialStuffingStages(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    action: { $in: AnalyticCredentialStuffingActions },
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $group: {
                    _id: { $ifNull: ['$ipAddress', 'unknown'] },
                    users: { $addToSet: '$userId' },
                    failCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    ipAddress: '$_id',
                    uniqueUsers: { $size: '$users' },
                    failCount: 1,
                    userIds: '$users',
                },
            },
            { $match: { uniqueUsers: { $gte: minUniqueAccounts } } },
        ];
    }

    private accountTakeoverStages(
        range: IAnalyticDateRange,
        newDeviceAfterPasswordChangeInMs: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    type: EnumPasswordHistoryType.profile,
                    createdAt: { $gte: start, $lt: end },
                },
            },
            this.newDeviceLookupStage(newDeviceAfterPasswordChangeInMs),
            { $match: { hit: { $ne: [] } } },
            {
                $project: {
                    userId: 1,
                    passwordChangedAt: {
                        $dateToString: { date: '$createdAt' },
                    },
                },
            },
        ];
    }

    private sessionAfterAdminStages(
        range: IAnalyticDateRange,
        sessionAfterAdminRevokeInMs: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    action: {
                        $in: [
                            EnumActivityLogAction.userSessionRevokedByAdmin,
                            EnumActivityLogAction.userAllSessionsRevokedByAdmin,
                        ],
                    },
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $lookup: {
                    from: 'ActivityLogs',
                    localField: 'userId',
                    foreignField: 'userId',
                    let: { revokedAt: '$createdAt' },
                    pipeline: [
                        {
                            $match: {
                                action: { $in: UserLoginAnalyticActions },
                                $expr: {
                                    $and: [
                                        { $gte: ['$createdAt', '$$revokedAt'] },
                                        {
                                            $lt: [
                                                '$createdAt',
                                                {
                                                    $add: [
                                                        '$$revokedAt',
                                                        sessionAfterAdminRevokeInMs,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        { $sort: { createdAt: 1 } },
                        { $limit: 1 },
                        { $project: { createdAt: 1 } },
                    ],
                    as: 'login',
                },
            },
            { $unwind: '$login' },
            {
                $project: {
                    userId: 1,
                    revokedAt: { $dateToString: { date: '$createdAt' } },
                    loginAt: { $dateToString: { date: '$login.createdAt' } },
                },
            },
        ];
    }

    private sharedFingerprintStages(
        minUsersPerFingerprint: number
    ): Prisma.InputJsonValue[] {
        return [
            { $match: { isRevoked: false } },
            {
                $group: {
                    _id: '$deviceId',
                    userIds: { $addToSet: '$userId' },
                },
            },
            {
                $match: {
                    $expr: {
                        $gte: [{ $size: '$userIds' }, minUsersPerFingerprint],
                    },
                },
            },
            {
                $lookup: {
                    from: 'Devices',
                    localField: '_id',
                    foreignField: '_id',
                    pipeline: [{ $project: { fingerprint: 1 } }],
                    as: 'device',
                },
            },
            {
                $project: {
                    fingerprint: { $first: '$device.fingerprint' },
                    userCount: { $size: '$userIds' },
                    userIds: 1,
                },
            },
        ];
    }

    private ipCountStages(
        actions: EnumActivityLogAction[],
        range: IAnalyticDateRange,
        minCount: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    action: { $in: actions },
                    ipAddress: { $ne: null },
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $group: {
                    _id: '$ipAddress',
                    count: { $sum: 1 },
                    userIds: { $addToSet: '$userId' },
                },
            },
            { $match: { count: { $gte: minCount } } },
            { $project: { key: '$_id', count: 1, userIds: 1 } },
        ];
    }

    private massRegistrationStages(
        range: IAnalyticDateRange,
        minAccountsPerIp: number
    ): Prisma.InputJsonValue[] {
        return this.ipCountStages(
            AnalyticMassRegistrationActions,
            range,
            minAccountsPerIp
        );
    }

    private forgotPasswordAbuseStages(
        range: IAnalyticDateRange,
        minUnusedTokens: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    isUsed: false,
                    createdAt: { $gte: start, $lt: end },
                },
            },
            { $group: { _id: '$userId', tokenCount: { $sum: 1 } } },
            { $match: { tokenCount: { $gte: minUnusedTokens } } },
            { $project: { userId: '$_id', tokenCount: 1 } },
        ];
    }

    private windowBefore(now: Date, windowInMs: number): IAnalyticDateRange {
        const startDate = this.helperDateService.backward(
            now,
            Duration.fromMillis(windowInMs)
        );

        return { startDate, endDate: now };
    }

    private unionSignalStage(
        collection: string,
        stages: Prisma.InputJsonValue[],
        signal: EnumAnalyticFraudContributingSignal,
        userIdField: string
    ): Prisma.InputJsonValue {
        return {
            $unionWith: {
                coll: collection,
                pipeline: [
                    ...stages,
                    {
                        $project: {
                            _id: 0,
                            userId: userIdField,
                            signal: { $literal: signal },
                        },
                    },
                ],
            },
        };
    }

    private async countStages(
        delegate:
            | DatabaseService['client']['activityLog']
            | DatabaseService['client']['passwordHistory'],
        stages: Prisma.InputJsonValue[]
    ): Promise<number> {
        const result = await delegate.aggregateRaw({
            pipeline: [...stages, { $count: 'n' }],
        });
        const parsed = AnalyticFraudCountPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data[0]?.n ?? 0;
    }

    async countCredentialStuffing(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Promise<number> {
        const stages = this.credentialStuffingStages(range, minUniqueAccounts);
        return this.countStages(
            this.databaseService.client.activityLog,
            stages
        );
    }

    async findCredentialStuffingOffset(
        range: IAnalyticDateRange,
        minUniqueAccounts: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const stages = this.credentialStuffingStages(range, minUniqueAccounts);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed =
            AnalyticCredentialStuffingPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            row?.data ?? [],
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async countAccountTakeover(
        range: IAnalyticDateRange,
        newDeviceAfterPasswordChangeInMs: number
    ): Promise<number> {
        const stages = this.accountTakeoverStages(
            range,
            newDeviceAfterPasswordChangeInMs
        );
        return this.countStages(
            this.databaseService.client.passwordHistory,
            stages
        );
    }

    async findAccountTakeoverOffset(
        range: IAnalyticDateRange,
        newDeviceAfterPasswordChangeInMs: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        const stages = this.accountTakeoverStages(
            range,
            newDeviceAfterPasswordChangeInMs
        );
        const result =
            await this.databaseService.client.passwordHistory.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed = AnalyticAccountTakeoverPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            (row?.data ?? []).map(item => ({
                userId: item.userId,
                indicatorCodes: [
                    EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                ],
                passwordChangedAt: item.passwordChangedAt,
            })),
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async countSessionAfterAdmin(
        range: IAnalyticDateRange,
        sessionAfterAdminRevokeInMs: number
    ): Promise<number> {
        const stages = this.sessionAfterAdminStages(
            range,
            sessionAfterAdminRevokeInMs
        );
        return this.countStages(
            this.databaseService.client.activityLog,
            stages
        );
    }

    async findSessionAfterAdminOffset(
        range: IAnalyticDateRange,
        sessionAfterAdminRevokeInMs: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        const stages = this.sessionAfterAdminStages(
            range,
            sessionAfterAdminRevokeInMs
        );
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed =
            AnalyticSessionAfterAdminPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            row?.data ?? [],
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async findSharedFingerprints(
        minUsersPerFingerprint: number
    ): Promise<IAnalyticSharedFingerprint[]> {
        const pipeline = this.sharedFingerprintStages(minUsersPerFingerprint);
        const result =
            await this.databaseService.client.deviceOwnership.aggregateRaw({
                pipeline,
            });
        const parsed =
            AnalyticSharedFingerprintPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data;
    }

    async countMassRegistration(
        range: IAnalyticDateRange,
        minAccountsPerIp: number
    ): Promise<number> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['ipAddress'],
            where: {
                action: { in: AnalyticMassRegistrationActions },
                ipAddress: { not: null },
                createdAt: { gte: range.startDate, lt: range.endDate },
            },
            having: { ipAddress: { _count: { gte: minAccountsPerIp } } },
        });

        return rows.length;
    }

    async findMassRegistrationOffset(
        range: IAnalyticDateRange,
        minAccountsPerIp: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const stages = this.massRegistrationStages(range, minAccountsPerIp);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed = AnalyticKeyCountPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            row?.data ?? [],
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async countPasswordResetEnumeration(
        range: IAnalyticDateRange,
        minRequestsPerIp: number
    ): Promise<number> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['ipAddress'],
            where: {
                action: EnumActivityLogAction.userPasswordResetRequested,
                ipAddress: { not: null },
                createdAt: { gte: range.startDate, lt: range.endDate },
            },
            having: { ipAddress: { _count: { gte: minRequestsPerIp } } },
        });

        return rows.length;
    }

    async findPasswordResetEnumerationOffset(
        range: IAnalyticDateRange,
        minRequestsPerIp: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const stages = this.ipCountStages(
            [EnumActivityLogAction.userPasswordResetRequested],
            range,
            minRequestsPerIp
        );
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed = AnalyticKeyCountPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            row?.data ?? [],
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async countForgotPasswordAbuse(
        range: IAnalyticDateRange,
        minUnusedTokens: number
    ): Promise<number> {
        const rows = await this.databaseService.client.forgotPassword.groupBy({
            by: ['userId'],
            where: {
                isUsed: false,
                createdAt: { gte: range.startDate, lt: range.endDate },
            },
            having: { userId: { _count: { gte: minUnusedTokens } } },
        });

        return rows.length;
    }

    async findForgotPasswordAbuseOffset(
        range: IAnalyticDateRange,
        minUnusedTokens: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const stages = this.forgotPasswordAbuseStages(range, minUnusedTokens);
        const result =
            await this.databaseService.client.forgotPassword.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed =
            AnalyticForgotPasswordAbusePipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return this.paginationOffsetUtil.page(
            row?.data ?? [],
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async existsUserById(id: string): Promise<boolean> {
        const count = await this.databaseService.client.user.count({
            where: { id, deletedAt: null },
        });

        return count > 0;
    }

    async findRiskScoreCandidates(
        options: IAnalyticRiskScoreOptions
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticFraudRiskScore>[]> {
        const { now, weights, bands } = options;
        const signal = EnumAnalyticFraudContributingSignal;
        const lookback = this.windowBefore(now, options.riskScore.lookbackInMs);
        const credentialStuffingRange = this.windowBefore(
            now,
            options.credentialStuffing.windowInMs
        );
        const massRegistrationRange = this.windowBefore(
            now,
            options.massRegistration.windowInMs
        );
        const forgotPasswordRange = this.windowBefore(
            now,
            options.forgotPasswordTokenAbuse.windowInMs
        );
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const sessionAfterAdminStages = this.sessionAfterAdminStages(
            lookback,
            options.sessionAfterAdmin.sessionAfterAdminRevokeInMs
        );
        const impossibleTravelStages =
            this.analyticPipelineUtil.impossibleTravelStages(
                lookback,
                options.impossibleTravel
            );
        const accountTakeoverStages = this.accountTakeoverStages(
            lookback,
            options.accountTakeover.newDeviceAfterPasswordChangeInMs
        );
        const credentialStuffingStages = this.credentialStuffingStages(
            credentialStuffingRange,
            options.credentialStuffing.minUniqueAccounts
        );
        const sharedFingerprintStages = this.sharedFingerprintStages(
            options.sharedFingerprint.minUsersPerFingerprint
        );
        const massRegistrationStages = this.massRegistrationStages(
            massRegistrationRange,
            options.massRegistration.minAccountsPerIp
        );
        const forgotPasswordAbuseStages = this.forgotPasswordAbuseStages(
            forgotPasswordRange,
            options.forgotPasswordTokenAbuse.minUnusedTokens
        );
        const sessionAfterAdminUnion = this.unionSignalStage(
            'ActivityLogs',
            sessionAfterAdminStages,
            signal.sessionAfterAdmin,
            '$userId'
        );
        const impossibleTravelUnion = this.unionSignalStage(
            'Sessions',
            impossibleTravelStages,
            signal.impossibleTravel,
            '$userId'
        );
        const accountTakeoverUnion = this.unionSignalStage(
            'PasswordHistories',
            accountTakeoverStages,
            signal.newDeviceAfterPasswordChange,
            '$userId'
        );
        const credentialStuffingUnion = this.unionSignalStage(
            'ActivityLogs',
            [...credentialStuffingStages, { $unwind: '$userIds' }],
            signal.credentialStuffingIp,
            '$userIds'
        );
        const sharedFingerprintUnion = this.unionSignalStage(
            'DeviceOwnerships',
            [...sharedFingerprintStages, { $unwind: '$userIds' }],
            signal.sharedFingerprint,
            '$userIds'
        );
        const massRegistrationUnion = this.unionSignalStage(
            'ActivityLogs',
            [...massRegistrationStages, { $unwind: '$userIds' }],
            signal.massRegistrationIp,
            '$userIds'
        );
        const forgotPasswordAbuseUnion = this.unionSignalStage(
            'ForgotPasswords',
            forgotPasswordAbuseStages,
            signal.forgotPasswordAbuse,
            '$userId'
        );
        const weightBranches = Object.entries(weights).map(
            ([name, weight]) => ({
                case: { $eq: ['$$hit', name] },
                then: weight,
            })
        );
        const pipeline: Prisma.InputJsonValue[] = [
            {
                $match: {
                    $or: [
                        {
                            passwordAttempt: {
                                $gte: options.nearLockoutMinAttempt,
                            },
                        },
                        { passwordLockedUntil: { $gt: nowDate } },
                    ],
                },
            },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    signal: { $literal: signal.nearLockout },
                },
            },
            sessionAfterAdminUnion,
            impossibleTravelUnion,
            accountTakeoverUnion,
            credentialStuffingUnion,
            sharedFingerprintUnion,
            massRegistrationUnion,
            forgotPasswordAbuseUnion,
            {
                $group: {
                    _id: '$userId',
                    signals: { $addToSet: '$signal' },
                },
            },
            {
                $lookup: {
                    from: 'Users',
                    localField: '_id',
                    foreignField: '_id',
                    pipeline: [
                        { $match: { deletedAt: null } },
                        { $project: { _id: 1 } },
                    ],
                    as: 'user',
                },
            },
            { $match: { user: { $ne: [] } } },
            {
                $addFields: {
                    score: {
                        $sum: {
                            $map: {
                                input: '$signals',
                                as: 'hit',
                                in: {
                                    $switch: {
                                        branches: weightBranches,
                                        default: 0,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { $match: { score: { $gt: 0 } } },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    score: 1,
                    band: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $lte: ['$score', bands.monitorMax],
                                    },
                                    then: EnumAnalyticFraudBand.monitor,
                                },
                                {
                                    case: {
                                        $lte: ['$score', bands.reviewMax],
                                    },
                                    then: EnumAnalyticFraudBand.review,
                                },
                                {
                                    case: {
                                        $lte: ['$score', bands.elevateMax],
                                    },
                                    then: EnumAnalyticFraudBand.elevate,
                                },
                            ],
                            default: EnumAnalyticFraudBand.critical,
                        },
                    },
                    signals: {
                        $filter: {
                            input: Object.values(signal),
                            as: 'ordered',
                            cond: { $in: ['$$ordered', '$signals'] },
                        },
                    },
                },
            },
        ];
        const result = await this.databaseService.client.user.aggregateRaw({
            pipeline,
        });
        const parsed = AnalyticRiskScorePipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({
            key: row.userId,
            value: row.score,
            occurredAt: null,
            data: {
                userId: row.userId,
                score: row.score,
                band: row.band,
                contributingSignalCodes: row.signals,
            },
        }));
    }
}
