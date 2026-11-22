import { AnalyticBucketsResultCacheSchema } from '@modules/analytic/dtos/analytic.buckets-result-cache.dto';

describe('AnalyticBucketsResultCacheSchema', () => {
    const payload = {
        buckets: [{ key: 'key-1', count: 1 }],
        undeclared: 'extra',
    };
    const expected = { buckets: [{ key: 'key-1', count: 1 }] };
    const invalid = { buckets: [{ key: 123, count: 1 }] };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticBucketsResultCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with buckets.0.key of the wrong type', () => {
        const result = AnalyticBucketsResultCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['buckets', 0, 'key'],
                code: 'invalid_type',
            }),
        ]);
    });
});
