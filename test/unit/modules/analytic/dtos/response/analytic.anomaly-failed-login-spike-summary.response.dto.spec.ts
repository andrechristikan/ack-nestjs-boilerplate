import { AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-failed-login-spike-summary.response.dto';

describe('AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema', () => {
    const row = {
        count: 4,
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2026-01-02T00:00:00.000Z'),
        computedAt: new Date('2026-01-02T00:00:05.000Z'),
        metadata: { nearLockoutMinAttempt: 4 },
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

    it('strips a bucketCount key from metadata', () => {
        const result =
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                ...row,
                metadata: { ...row.metadata, bucketCount: 2 },
            });

        expect(result).toEqual(row);
    });

    it('rejects a row without metadata', () => {
        expect(() =>
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                count: row.count,
                windowStart: row.windowStart,
                windowEnd: row.windowEnd,
                computedAt: row.computedAt,
            })
        ).toThrow();
    });

    it('rejects a summary without the window and computedAt keys', () => {
        expect(() =>
            AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema.parse({
                count: row.count,
                metadata: row.metadata,
            })
        ).toThrow();
    });
});
