import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';

describe('AnalyticBucketUtil', () => {
    let util: AnalyticBucketUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticBucketUtil],
        }).compile();

        util = module.get(AnalyticBucketUtil);
    });

    describe('toBuckets', () => {
        it('maps each row to a bucket keyed by the named field as a string', () => {
            const rows = [
                { userId: 'user-1', count: 3 },
                { userId: 'user-2', count: 1 },
            ];

            expect(util.toBuckets(rows, 'userId')).toEqual([
                { key: 'user-1', count: 3 },
                { key: 'user-2', count: 1 },
            ]);
        });

        it('stringifies a non-string key', () => {
            expect(util.toBuckets([{ key: 7, count: 2 }], 'key')).toEqual([
                { key: '7', count: 2 },
            ]);
        });

        it('returns an empty list for no rows', () => {
            expect(util.toBuckets([], 'key')).toEqual([]);
        });
    });

    describe('toBucketSnapshot', () => {
        it('maps each bucket to a snapshot item whose value is its index', () => {
            const buckets = [
                { key: '1', count: 2 },
                { key: '2', count: 0 },
            ];

            expect(util.toBucketSnapshot(buckets)).toEqual({
                items: [
                    {
                        key: '1',
                        value: 0,
                        occurredAt: null,
                        data: { key: '1', count: 2 },
                    },
                    {
                        key: '2',
                        value: 1,
                        occurredAt: null,
                        data: { key: '2', count: 0 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            });
        });
    });
});
