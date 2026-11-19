import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IActivityLogAnalyticActionCount } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    AnalyticAuthConcurrentSessionsPipelineSchema,
    AnalyticAuthMfaAdoptionPipelineSchema,
    AnalyticAuthSessionsGroupPipelineSchema,
    AnalyticCountRanges,
} from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticAuthRepository } from '@modules/analytic/interfaces/analytic.auth-repository.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticGroupCount,
    IAnalyticMfaAdoptionCount,
    IAnalyticUsedGroupCount,
    IAnalyticVerificationGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class AnalyticAuthRepository implements IAnalyticAuthRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    private activeSessionsInRangeStages(
        startDate: Date,
        endDate: Date,
        now: Date,
        idleSince: Date
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const idleSinceDate = this.analyticPipelineUtil.toDate(idleSince);

        return [
            {
                $match: {
                    isRevoked: false,
                    expiredAt: { $gt: nowDate },
                    lastActiveAt: { $gte: idleSinceDate },
                    createdAt: { $gte: start, $lt: end },
                },
            },
        ];
    }

    async countActivityByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.databaseService.client.activityLog.count({
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupActivityByAction(
        actions: EnumActivityLogAction[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['action'],
            where: {
                action: { in: actions },
                ...(startDate &&
                    endDate && {
                        createdAt: { gte: startDate, lt: endDate },
                    }),
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            action: row.action,
            count: row._count._all,
        }));
    }

    async findConcurrentSessions(
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticCountBucket[]> {
        const lastIndex = AnalyticCountRanges.length - 1;
        const defaultKey = AnalyticCountRanges[lastIndex]!.key;
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const idleSinceDate = this.analyticPipelineUtil.toDate(idleSince);
        const result = await this.databaseService.client.session.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        isRevoked: false,
                        expiredAt: { $gt: nowDate },
                        lastActiveAt: { $gte: idleSinceDate },
                    },
                },
                { $group: { _id: '$userId', sessions: { $sum: 1 } } },
                {
                    $bucket: {
                        groupBy: '$sessions',
                        boundaries: AnalyticCountRanges.map(range => range.min),
                        default: defaultKey,
                        output: { count: { $sum: 1 } },
                    },
                },
            ],
        });
        const parsed =
            AnalyticAuthConcurrentSessionsPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const countById = new Map(parsed.data.map(row => [row._id, row.count]));

        return AnalyticCountRanges.map((range, index) => ({
            key: range.key,
            count:
                countById.get(index === lastIndex ? range.key : range.min) ?? 0,
        }));
    }

    async groupSessionsGeo(
        startDate: Date,
        endDate: Date,
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticGroupCount[]> {
        const activeStages = this.activeSessionsInRangeStages(
            startDate,
            endDate,
            now,
            idleSince
        );
        const result = await this.databaseService.client.session.aggregateRaw({
            pipeline: [
                ...activeStages,
                {
                    $group: {
                        _id: '$geoLocation.country',
                        count: { $sum: 1 },
                    },
                },
            ],
        });
        const parsed =
            AnalyticAuthSessionsGroupPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({ key: row._id, count: row.count }));
    }

    async groupSessionsUserAgent(
        startDate: Date,
        endDate: Date,
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticGroupCount[]> {
        const activeStages = this.activeSessionsInRangeStages(
            startDate,
            endDate,
            now,
            idleSince
        );
        const result = await this.databaseService.client.session.aggregateRaw({
            pipeline: [
                ...activeStages,
                {
                    $group: {
                        _id: {
                            $ifNull: [
                                '$userAgent.browser.name',
                                '$userAgent.os.name',
                                null,
                            ],
                        },
                        count: { $sum: 1 },
                    },
                },
            ],
        });
        const parsed =
            AnalyticAuthSessionsGroupPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({ key: row._id, count: row.count }));
    }

    async groupVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationGroupCount[]> {
        const rows = await this.databaseService.client.verification.groupBy({
            by: ['type', 'isUsed'],
            where: {
                type: {
                    in: [
                        EnumVerificationType.email,
                        EnumVerificationType.mobileNumber,
                    ],
                },
                createdAt: { gte: startDate, lt: endDate },
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            type: row.type,
            isUsed: row.isUsed,
            count: row._count._all,
        }));
    }

    async countPasswordHistoryByType(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.databaseService.client.passwordHistory.count({
            where: {
                type,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticUsedGroupCount[]> {
        const rows = await this.databaseService.client.forgotPassword.groupBy({
            by: ['isUsed'],
            where: { createdAt: { gte: startDate, lt: endDate } },
            _count: { _all: true },
        });

        return rows.map(row => ({
            isUsed: row.isUsed,
            count: row._count._all,
        }));
    }

    async findMfaAdoption(): Promise<IAnalyticMfaAdoptionCount> {
        const result = await this.databaseService.client.mfa.aggregateRaw({
            pipeline: [
                {
                    $lookup: {
                        from: 'Users',
                        let: { mfaUserId: '$userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$_id', '$$mfaUserId'] },
                                            {
                                                $eq: [
                                                    {
                                                        $ifNull: [
                                                            '$deletedAt',
                                                            null,
                                                        ],
                                                    },
                                                    null,
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            { $limit: 1 },
                            { $project: { _id: 1 } },
                        ],
                        as: 'activeUser',
                    },
                },
                { $match: { activeUser: { $ne: [] } } },
                {
                    $lookup: {
                        from: 'MfaTotps',
                        let: { mfaUserId: '$userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$userId', '$$mfaUserId'] },
                                            {
                                                $ne: [
                                                    {
                                                        $ifNull: [
                                                            '$secret',
                                                            null,
                                                        ],
                                                    },
                                                    null,
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            { $limit: 1 },
                            { $project: { _id: 1 } },
                        ],
                        as: 'totp',
                    },
                },
                {
                    $lookup: {
                        from: 'MfaPasskeys',
                        let: { mfaUserId: '$userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$userId', '$$mfaUserId'] },
                                },
                            },
                            { $limit: 1 },
                            { $project: { _id: 1 } },
                        ],
                        as: 'passkeys',
                    },
                },
                {
                    $group: {
                        _id: null,
                        enabled: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            { $gt: [{ $size: '$totp' }, 0] },
                                            {
                                                $gt: [
                                                    { $size: '$passkeys' },
                                                    0,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $unionWith: {
                        coll: 'Users',
                        pipeline: [
                            { $match: { deletedAt: null } },
                            { $count: 'total' },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        enabled: { $max: '$enabled' },
                        total: { $max: '$total' },
                    },
                },
            ],
        });
        const parsed = AnalyticAuthMfaAdoptionPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return { enabled: row?.enabled ?? 0, total: row?.total ?? 0 };
    }
}
