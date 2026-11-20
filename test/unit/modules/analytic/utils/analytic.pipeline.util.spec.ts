import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';

describe('AnalyticPipelineUtil', () => {
    let util: AnalyticPipelineUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticPipelineUtil],
        }).compile();

        util = module.get(AnalyticPipelineUtil);
    });

    describe('toDate', () => {
        it('returns the extended JSON date of the argument', () => {
            const result = util.toDate(new Date('2026-01-01T00:00:00.000Z'));

            expect(result).toEqual({ $date: '2026-01-01T00:00:00.000Z' });
        });
    });

    describe('toObjectId', () => {
        it('returns the extended JSON object id of the argument', () => {
            const result = util.toObjectId('abc');

            expect(result).toEqual({ $oid: 'abc' });
        });
    });
    describe('sortStage', () => {
        it('returns one $sort stage with each order entry then the tiebreak ascending', () => {
            const result = util.sortStage(
                [{ count: EnumPaginationOrderDirectionType.desc }],
                '_id'
            );

            expect(result).toEqual({ $sort: { count: -1, _id: 1 } });
        });

        it('keeps the order entries in order and maps asc to 1', () => {
            const result = util.sortStage(
                [
                    { value: EnumPaginationOrderDirectionType.asc },
                    { count: EnumPaginationOrderDirectionType.desc },
                ],
                '_id'
            );

            expect(Object.entries(result.$sort)).toEqual([
                ['value', 1],
                ['count', -1],
                ['_id', 1],
            ]);
        });

        it('returns the tiebreak alone for an empty order', () => {
            const result = util.sortStage([], '_id');

            expect(result).toEqual({ $sort: { _id: 1 } });
        });
    });
    describe('pageStage', () => {
        it('returns a $facet of the sorted, skipped, limited data and the total count', () => {
            const result = util.pageStage(
                {
                    orderBy: [{ count: EnumPaginationOrderDirectionType.desc }],
                    skip: 20,
                    limit: 10,
                },
                '_id'
            );

            expect(result).toEqual({
                $facet: {
                    data: [
                        { $sort: { count: -1, _id: 1 } },
                        { $skip: 20 },
                        { $limit: 10 },
                    ],
                    total: [{ $count: 'n' }],
                },
            });
        });
    });
    describe('impossibleTravelStages', () => {
        const range = {
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-02-01T00:00:00.000Z'),
        };
        const thresholds = { minDistanceKm: 500, maxDeltaInMs: 3600000 };

        it('bounds the first match to the range and to sessions with a geo location', () => {
            const [match] = util.impossibleTravelStages(range, thresholds);

            expect(match).toEqual({
                $match: {
                    createdAt: {
                        $gte: { $date: '2026-01-01T00:00:00.000Z' },
                        $lt: { $date: '2026-02-01T00:00:00.000Z' },
                    },
                    geoLocation: { $ne: null },
                },
            });
        });

        it('pairs each session with the previous one of the same user in creation order', () => {
            const stages = util.impossibleTravelStages(range, thresholds);

            const window = stages[1];

            expect(window).toMatchObject({
                $setWindowFields: {
                    partitionBy: '$userId',
                    sortBy: { createdAt: 1 },
                },
            });
        });

        it('keeps only pairs farther than the distance and quicker than the delta it is given', () => {
            const stages = util.impossibleTravelStages(range, thresholds);

            expect(stages).toContainEqual({
                $match: {
                    distanceKm: { $gt: 500 },
                    deltaMs: { $lt: 3600000 },
                },
            });
        });

        it('projects the user, both sessions, the distance, the delta, and the later creation time as an ISO string', () => {
            const stages = util.impossibleTravelStages(range, thresholds);

            expect(stages.at(-1)).toMatchObject({
                $project: {
                    _id: 0,
                    userId: 1,
                    fromSessionId: '$prevId',
                    toSessionId: '$_id',
                    distanceKm: 1,
                    deltaMs: 1,
                    occurredAt: { $dateToString: { date: '$createdAt' } },
                },
            });
        });
    });
});
