import { AnalyticLockoutMetricsCacheSchema } from '@modules/analytic/dtos/analytic.lockout-metrics-cache.dto';

describe('AnalyticLockoutMetricsCacheSchema', () => {
    const payload = { failed: 1, maxAttempt: 2, undeclared: 'extra' };
    const expected = { failed: 1, maxAttempt: 2 };
    const invalid = { failed: 'text', maxAttempt: 2 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticLockoutMetricsCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with failed of the wrong type', () => {
        const result = AnalyticLockoutMetricsCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['failed'],
                code: 'invalid_type',
            }),
        ]);
    });
});
