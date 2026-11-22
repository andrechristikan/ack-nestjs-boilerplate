import { AnalyticMetricRateCacheSchema } from '@modules/analytic/dtos/analytic.metric-rate-cache.dto';

describe('AnalyticMetricRateCacheSchema', () => {
    const payload = { count: 1, total: 2, rate: 3, undeclared: 'extra' };
    const expected = { count: 1, total: 2, rate: 3 };
    const invalid = { count: 'text', total: 2, rate: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticMetricRateCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with count of the wrong type', () => {
        const result = AnalyticMetricRateCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['count'],
                code: 'invalid_type',
            }),
        ]);
    });
});
