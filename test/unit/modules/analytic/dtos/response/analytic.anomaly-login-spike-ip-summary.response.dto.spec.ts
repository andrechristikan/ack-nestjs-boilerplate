import { AnalyticAnomalyLoginSpikeIpSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-login-spike-ip-summary.response.dto';

describe('AnalyticAnomalyLoginSpikeIpSummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: '3600000',
        meta: { minUniqueAccounts: 5 },
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

    it('rejects a row without meta', () => {
        expect(() =>
            AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse({
                count: row.count,
                window: row.window,
            })
        ).toThrow();
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticAnomalyLoginSpikeIpSummaryResponseSchema.parse({
                count: row.count,
                meta: row.meta,
            })
        ).toThrow();
    });
});
