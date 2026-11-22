import { AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-failed-login-spike-summary.response.dto';

describe('AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: null,
        meta: { nearLockoutMinAttempt: 4, bucketCount: 2 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result =
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                ...row,
                sessions: [{ id: 'session-1' }],
            });

        expect(result).toEqual(row);
    });

    it('rejects a row without meta', () => {
        expect(() =>
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                count: row.count,
                window: row.window,
            })
        ).toThrow();
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                count: row.count,
                meta: row.meta,
            })
        ).toThrow();
    });
});
