import { AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema } from '@modules/analytic/dtos/analytic.anomaly-failed-login-spike-summary-cache.dto';

describe('AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema', () => {
    const payload = {
        count: 1,
        windowStart: '2026-01-02T03:04:05.000Z',
        windowEnd: '2026-01-02T03:04:05.000Z',
        computedAt: '2026-01-02T03:04:05.000Z',
        metadata: { nearLockoutMinAttempt: 2 },
        undeclared: 'extra',
    };
    const expected = {
        count: 1,
        windowStart: new Date('2026-01-02T03:04:05.000Z'),
        windowEnd: new Date('2026-01-02T03:04:05.000Z'),
        computedAt: new Date('2026-01-02T03:04:05.000Z'),
        metadata: { nearLockoutMinAttempt: 2 },
    };
    const invalid = {
        count: 'text',
        windowStart: '2026-01-02T03:04:05.000Z',
        windowEnd: '2026-01-02T03:04:05.000Z',
        computedAt: '2026-01-02T03:04:05.000Z',
        metadata: { nearLockoutMinAttempt: 2 },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with count of the wrong type', () => {
        const result =
            AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema.safeParse(
                invalid
            );

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['count'],
                code: 'invalid_type',
            }),
        ]);
    });
});
