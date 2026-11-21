import { DatabaseService } from '@common/database/services/database.service';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    EnumActivityLogAction,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import {
    AnalyticUserActivePipelineSchema,
    AnalyticUserBlockedPipelineSchema,
    AnalyticUserChurnPipelineSchema,
} from '@modules/analytic/constants/analytic.constant';
import type {
    IAnalyticActiveUsersCount,
    IAnalyticBlockedUsers,
    IAnalyticChurnCount,
    IAnalyticCountBucket,
    IAnalyticVerifiedGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticUserRepository } from '@modules/analytic/interfaces/analytic.user-repository.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticUserRepository implements IAnalyticUserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async countRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                signUpAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async findChurnCounts(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticChurnCount> {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const result = await this.databaseService.client.user.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        $or: [
                            {
                                signUpAt: { $lt: start },
                                $or: [
                                    { deletedAt: null },
                                    { deletedAt: { $gte: start } },
                                ],
                            },
                            { deletedAt: { $gte: start, $lt: end } },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $lt: ['$signUpAt', start] },
                                            {
                                                $or: [
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
                                                    {
                                                        $gte: [
                                                            '$deletedAt',
                                                            start,
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        deleted: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ['$deletedAt', start] },
                                            { $lt: ['$deletedAt', end] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ],
        });
        const parsed = AnalyticUserChurnPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return { deleted: row?.deleted ?? 0, total: row?.total ?? 0 };
    }

    async findBlockedCounts(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    {
                        $match: {
                            action: EnumActivityLogAction.userBlockedByAdmin,
                            createdAt: { $gte: start, $lt: end },
                        },
                    },
                    { $count: 'trend' },
                    {
                        $unionWith: {
                            coll: 'Users',
                            pipeline: [
                                {
                                    $match: {
                                        status: EnumUserStatus.blocked,
                                        deletedAt: null,
                                    },
                                },
                                { $count: 'current' },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            trend: { $max: '$trend' },
                            current: { $max: '$current' },
                        },
                    },
                ],
            });
        const parsed = AnalyticUserBlockedPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return { trend: row?.trend ?? 0, current: row?.current ?? 0 };
    }

    async findActiveCounts(
        dailySince: Date,
        weeklySince: Date,
        monthlySince: Date
    ): Promise<IAnalyticActiveUsersCount> {
        const daily = this.analyticPipelineUtil.toDate(dailySince);
        const weekly = this.analyticPipelineUtil.toDate(weeklySince);
        const monthly = this.analyticPipelineUtil.toDate(monthlySince);
        const result = await this.databaseService.client.user.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        deletedAt: null,
                        lastLoginAt: { $gte: monthly },
                    },
                },
                {
                    $group: {
                        _id: null,
                        daily: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$lastLoginAt', daily] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        weekly: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$lastLoginAt', weekly] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        monthly: { $sum: 1 },
                    },
                },
            ],
        });
        const parsed = AnalyticUserActivePipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return {
            daily: row?.daily ?? 0,
            weekly: row?.weekly ?? 0,
            monthly: row?.monthly ?? 0,
        };
    }

    async groupSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['signUpWith'],
            where: {
                deletedAt: null,
                ...(startDate &&
                    endDate && { signUpAt: { gte: startDate, lt: endDate } }),
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            key: row.signUpWith,
            count: row._count._all,
        }));
    }

    async groupEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticVerifiedGroupCount[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['isVerified'],
            where: {
                deletedAt: null,
                ...(startDate &&
                    endDate && { signUpAt: { gte: startDate, lt: endDate } }),
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            isVerified: row.isVerified,
            count: row._count._all,
        }));
    }

    async groupStatus(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['status'],
            where: { deletedAt: null },
            _count: { _all: true },
        });

        return rows.map(row => ({ key: row.status, count: row._count._all }));
    }

    async groupCountry(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['countryId'],
            where: { deletedAt: null },
            _count: { _all: true },
        });

        return rows.map(row => ({
            key: row.countryId,
            count: row._count._all,
        }));
    }

    async groupRole(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['roleId'],
            where: { deletedAt: null },
            _count: { _all: true },
        });

        return rows.map(row => ({ key: row.roleId, count: row._count._all }));
    }
}
