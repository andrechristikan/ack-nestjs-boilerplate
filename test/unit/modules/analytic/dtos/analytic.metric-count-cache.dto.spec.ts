import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';

describe('AnalyticMetricCountCacheSchema', () => {
    const payload = { count: 1, undeclared: 'extra' };
    const expected = { count: 1 };
    const invalid = { count: 'text' };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticMetricCountCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with count of the wrong type', () => {
        const result = AnalyticMetricCountCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['count'],
                code: 'invalid_type',
            }),
        ]);
    });
});
