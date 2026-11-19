import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOrderBy,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticDateRange,
    IAnalyticImpossibleTravelThresholds,
    IAnalyticPipelineDate,
    IAnalyticPipelineObjectId,
    IAnalyticPipelineSortStage,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticPipelineUtil {
    toDate(date: Date): IAnalyticPipelineDate {
        return { $date: date.toISOString() };
    }

    toObjectId(id: string): IAnalyticPipelineObjectId {
        return { $oid: id };
    }

    sortStage(
        orderBy: IPaginationOrderBy[],
        tiebreak: string
    ): IAnalyticPipelineSortStage {
        const sort: Record<string, 1 | -1> = {};
        for (const entry of orderBy) {
            for (const [field, direction] of Object.entries(entry)) {
                sort[field] =
                    direction === EnumPaginationOrderDirectionType.desc
                        ? -1
                        : 1;
            }
        }
        sort[tiebreak] = 1;

        return { $sort: sort };
    }

    pageStage(
        params: IPaginationQueryOffsetParams,
        tiebreak: string
    ): Prisma.InputJsonObject {
        return {
            $facet: {
                data: [
                    this.sortStage(params.orderBy, tiebreak),
                    { $skip: params.skip },
                    { $limit: params.limit },
                ],
                total: [{ $count: 'n' }],
            },
        };
    }

    impossibleTravelStages(
        range: IAnalyticDateRange,
        { minDistanceKm, maxDeltaInMs }: IAnalyticImpossibleTravelThresholds
    ): Prisma.InputJsonObject[] {
        const earthRadiusKm = 6371;
        const start = this.toDate(range.startDate);
        const end = this.toDate(range.endDate);
        const previous = (field: string): Prisma.InputJsonObject => ({
            $shift: { output: field, by: -1 },
        });

        return [
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lt: end,
                    },
                    geoLocation: { $ne: null },
                },
            },
            {
                $setWindowFields: {
                    partitionBy: '$userId',
                    sortBy: { createdAt: 1 },
                    output: {
                        prevId: previous('$_id'),
                        prevLat: previous('$geoLocation.latitude'),
                        prevLng: previous('$geoLocation.longitude'),
                        prevCreatedAt: previous('$createdAt'),
                    },
                },
            },
            { $match: { prevId: { $ne: null } } },
            {
                $addFields: {
                    deltaMs: { $subtract: ['$createdAt', '$prevCreatedAt'] },
                    distanceKm: {
                        $let: {
                            vars: {
                                lat1: { $degreesToRadians: '$prevLat' },
                                lat2: {
                                    $degreesToRadians: '$geoLocation.latitude',
                                },
                                dLat: {
                                    $degreesToRadians: {
                                        $subtract: [
                                            '$geoLocation.latitude',
                                            '$prevLat',
                                        ],
                                    },
                                },
                                dLng: {
                                    $degreesToRadians: {
                                        $subtract: [
                                            '$geoLocation.longitude',
                                            '$prevLng',
                                        ],
                                    },
                                },
                            },
                            in: {
                                $multiply: [
                                    2 * earthRadiusKm,
                                    {
                                        $asin: {
                                            $sqrt: {
                                                $add: [
                                                    {
                                                        $pow: [
                                                            {
                                                                $sin: {
                                                                    $divide: [
                                                                        '$$dLat',
                                                                        2,
                                                                    ],
                                                                },
                                                            },
                                                            2,
                                                        ],
                                                    },
                                                    {
                                                        $multiply: [
                                                            { $cos: '$$lat1' },
                                                            { $cos: '$$lat2' },
                                                            {
                                                                $pow: [
                                                                    {
                                                                        $sin: {
                                                                            $divide:
                                                                                [
                                                                                    '$$dLng',
                                                                                    2,
                                                                                ],
                                                                        },
                                                                    },
                                                                    2,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $match: {
                    distanceKm: { $gt: minDistanceKm },
                    deltaMs: { $lt: maxDeltaInMs },
                },
            },
            {
                $project: {
                    _id: 0,
                    userId: 1,
                    fromSessionId: '$prevId',
                    toSessionId: '$_id',
                    distanceKm: 1,
                    deltaMs: 1,
                    occurredAt: { $dateToString: { date: '$createdAt' } },
                },
            },
        ];
    }
}
