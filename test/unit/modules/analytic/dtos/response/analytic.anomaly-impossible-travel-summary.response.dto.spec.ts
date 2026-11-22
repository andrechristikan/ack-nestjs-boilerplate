import { AnalyticAnomalyImpossibleTravelSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-impossible-travel-summary.response.dto';

describe('AnalyticAnomalyImpossibleTravelSummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: 'window-token',
        meta: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result =
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse({
                ...row,
                sessions: [{ id: 'session-1' }],
            });

        expect(result).toEqual(row);
    });

    it('rejects a row without meta', () => {
        expect(() =>
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse({
                count: row.count,
                window: row.window,
            })
        ).toThrow();
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse({
                count: row.count,
                meta: row.meta,
            })
        ).toThrow();
    });
});
