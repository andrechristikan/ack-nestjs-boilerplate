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
