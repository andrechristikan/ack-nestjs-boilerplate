import { AnalyticAnomalyLoginSpikeIpSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-login-spike-ip-summary.response.dto';

describe('AnalyticAnomalyLoginSpikeIpSummaryResponseSchema', () => {
    const row = {
        count: 4,
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2026-01-02T00:00:00.000Z'),
        computedAt: new Date('2026-01-02T00:00:05.000Z'),
        metadata: { minUniqueAccounts: 5 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse({
            ...row,
            sessions: [{ id: 'session-1' }],
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without metadata', () => {
        expect(() =>
            AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse({
                count: row.count,
                windowStart: row.windowStart,
                windowEnd: row.windowEnd,
                computedAt: row.computedAt,
            })
        ).toThrow();
    });

    it('rejects a summary without the window and computedAt keys', () => {
        expect(() =>
            AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse({
                count: row.count,
                metadata: row.metadata,
            })
        ).toThrow();
    });
});
