import { AnalyticCountBucketCacheSchema } from '@modules/analytic/dtos/analytic.count-bucket-cache.dto';

describe('AnalyticCountBucketCacheSchema', () => {
    const payload = { key: 'key-1', count: 1, undeclared: 'extra' };
    const expected = { key: 'key-1', count: 1 };
    const invalid = { key: 123, count: 1 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticCountBucketCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with key of the wrong type', () => {
        const result = AnalyticCountBucketCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['key'],
                code: 'invalid_type',
            }),
        ]);
    });
});
