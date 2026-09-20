import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

describe('AnalyticAnomalySummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: '3600000',
        meta: {
            minDistanceKm: 500,
            maxDeltaInMs: 3600000,
            minUniqueAccounts: 5,
            nearLockoutMinAttempt: 3,
            bucketCount: 2,
            avg: 1.5,
            stdDev: 0.25,
            zScoreThreshold: 3,
        },
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a count-only row when optional fields are omitted', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse({ count: 0 });

        expect(result).toEqual({ count: 0 });
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse({
            ...row,
            sessions: [{ id: 'session-1' }],
        });

        expect(result).toEqual(row);
    });
});
