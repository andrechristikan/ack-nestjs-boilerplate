import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import {
    AnalyticDeviceProliferationPipelineSchema,
    AnalyticImpossibleTravelPipelineSchema,
    AnalyticLoginSpikeIpCountPipelineSchema,
    AnalyticLoginSpikeIpPipelineSchema,
    AnalyticLoginTimeAnomalyPipelineSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticGroupKey } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticAnomalyRepository } from '@modules/analytic/interfaces/analytic.anomaly-repository.interface';
import type {
    IAnalyticDateRange,
    IAnalyticDeviceProliferationResult,
    IAnalyticImpossibleTravel,
    IAnalyticImpossibleTravelThresholds,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticLoginTimeAnomalyThresholds,
    IAnalyticNearLockout,
    IAnalyticSnapshotItemInput,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import {
    UserAdminNearLockoutSelect,
    UserLoginAnalyticActions,
} from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticAnomalyRepository implements IAnalyticAnomalyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    private loginSpikeIpStages(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Prisma.InputJsonValue[] {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);

        return [
            {
                $match: {
                    action: { $in: UserLoginAnalyticActions },
                    createdAt: {
                        $gte: start,
                        $lt: end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $ifNull: ['$ipAddress', EnumAnalyticGroupKey.unknown],
                    },
                    users: { $addToSet: '$userId' },
                    attempts: { $sum: 1 },
                },
            },
            {
                $project: {
                    ipAddress: '$_id',
                    uniqueUsers: { $size: '$users' },
                    attempts: 1,
                },
            },
            { $match: { uniqueUsers: { $gte: minUniqueAccounts } } },
        ];
    }

    async findImpossibleTravel(
        range: IAnalyticDateRange,
        thresholds: IAnalyticImpossibleTravelThresholds
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticImpossibleTravel>[]> {
        const pipeline = this.analyticPipelineUtil.impossibleTravelStages(
            range,
            thresholds
        );
        const result = await this.databaseService.client.session.aggregateRaw({
            pipeline,
        });
        const parsed = AnalyticImpossibleTravelPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({
            key: row.userId,
            value: row.distanceKm,
            occurredAt: row.occurredAt,
            data: {
                userId: row.userId,
                fromSessionId: row.fromSessionId,
                toSessionId: row.toSessionId,
                distanceKm: row.distanceKm,
                deltaMs: row.deltaMs,
            },
        }));
    }

    async findDeviceProliferation(
        zScoreThreshold: number
    ): Promise<IAnalyticDeviceProliferationResult> {
        const window = { documents: ['unbounded', 'unbounded'] };
        const result =
            await this.databaseService.client.deviceOwnership.aggregateRaw({
                pipeline: [
                    { $match: { isRevoked: false } },
                    {
                        $group: {
                            _id: '$userId',
                            deviceCount: { $sum: 1 },
                        },
                    },
                    {
                        $setWindowFields: {
                            output: {
                                avg: { $avg: '$deviceCount', window },
                                stdDev: { $stdDevPop: '$deviceCount', window },
                            },
                        },
                    },
                    {
                        $addFields: {
                            zScore: {
                                $cond: [
                                    { $eq: ['$stdDev', 0] },
                                    0,
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    '$deviceCount',
                                                    '$avg',
                                                ],
                                            },
                                            '$stdDev',
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $facet: {
                            stats: [
                                { $limit: 1 },
                                { $project: { _id: 0, avg: 1, stdDev: 1 } },
                            ],
                            rows: [
                                {
                                    $match: {
                                        zScore: { $gt: zScoreThreshold },
                                    },
                                },
                                { $sort: { deviceCount: -1, _id: 1 } },
                                { $project: { deviceCount: 1, zScore: 1 } },
                            ],
                        },
                    },
                ],
            });
        const parsed =
            AnalyticDeviceProliferationPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return {
            avg: row?.stats[0]?.avg ?? 0,
            stdDev: row?.stats[0]?.stdDev ?? 0,
            rows: (row?.rows ?? []).map(item => ({
                userId: item._id,
                deviceCount: item.deviceCount,
                zScore: item.zScore,
            })),
        };
    }

    async findLoginTimeAnomaly(
        range: IAnalyticDateRange,
        {
            minSample,
            historyLimit,
            historicalFrequencyPercent,
            timezone,
        }: IAnalyticLoginTimeAnomalyThresholds
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticLoginTimeAnomaly>[]> {
        const start = this.analyticPipelineUtil.toDate(range.startDate);
        const end = this.analyticPipelineUtil.toDate(range.endDate);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    {
                        $match: {
                            action: { $in: UserLoginAnalyticActions },
                            createdAt: {
                                $gte: start,
                                $lt: end,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: '$userId',
                            total: { $sum: 1 },
                            hours: {
                                $topN: {
                                    n: historyLimit,
                                    sortBy: { createdAt: -1 },
                                    output: {
                                        $hour: {
                                            date: '$createdAt',
                                            timezone,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    { $match: { total: { $gte: minSample } } },
                    {
                        $addFields: {
                            lastHour: { $first: '$hours' },
                            history: { $slice: ['$hours', 1, historyLimit] },
                        },
                    },
                    {
                        $addFields: {
                            historyLength: { $size: '$history' },
                            sameHourCount: {
                                $size: {
                                    $filter: {
                                        input: '$history',
                                        cond: { $eq: ['$$this', '$lastHour'] },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $addFields: {
                            historicalFrequencyPercent: {
                                $cond: [
                                    { $eq: ['$historyLength', 0] },
                                    0,
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    '$sameHourCount',
                                                    '$historyLength',
                                                ],
                                            },
                                            100,
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $match: {
                            historicalFrequencyPercent: {
                                $lt: historicalFrequencyPercent,
                            },
                        },
                    },
                    {
                        $project: {
                            lastHour: 1,
                            historicalFrequencyPercent: 1,
                        },
                    },
                ],
            });
        const parsed = AnalyticLoginTimeAnomalyPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({
            key: row._id,
            value: row.historicalFrequencyPercent,
            occurredAt: null,
            data: {
                userId: row._id,
                lastHour: row.lastHour,
                historicalFrequencyPercent: row.historicalFrequencyPercent,
            },
        }));
    }

    async countLoginSpikeIp(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Promise<number> {
        const stages = this.loginSpikeIpStages(range, minUniqueAccounts);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [...stages, { $count: 'n' }],
            });
        const parsed =
            AnalyticLoginSpikeIpCountPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data[0]?.n ?? 0;
    }

    async findLoginSpikeIpOffset(
        range: IAnalyticDateRange,
        minUniqueAccounts: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const stages = this.loginSpikeIpStages(range, minUniqueAccounts);
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    ...stages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed = AnalyticLoginSpikeIpPipelineSchema.safeParse(result);
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

    async countNearLockout(minAttempt: number, now: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                OR: [
                    { passwordAttempt: { gte: minAttempt } },
                    { passwordLockedUntil: { gt: now } },
                ],
            },
        });
    }

    async findNearLockoutOffset(
        minAttempt: number,
        now: Date,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const { where, ...rest } = params;

        return this.paginationService.offset(this.databaseService.client.user, {
            ...rest,
            where: {
                AND: [
                    ...(where ? [where] : []),
                    { deletedAt: null },
                    {
                        OR: [
                            { passwordAttempt: { gte: minAttempt } },
                            { passwordLockedUntil: { gt: now } },
                        ],
                    },
                ],
            },
            select: UserAdminNearLockoutSelect,
        });
    }
}
