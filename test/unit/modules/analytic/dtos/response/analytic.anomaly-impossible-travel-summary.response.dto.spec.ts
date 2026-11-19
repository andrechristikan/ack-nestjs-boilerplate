import { AnalyticAnomalyImpossibleTravelSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-impossible-travel-summary.response.dto';

describe('AnalyticAnomalyImpossibleTravelSummaryResponseSchema', () => {
    const row = {
        count: 4,
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2026-01-02T00:00:00.000Z'),
        computedAt: new Date('2026-01-02T00:00:05.000Z'),
        metadata: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
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

    it('rejects a row without metadata', () => {
        expect(() =>
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse({
                count: row.count,
                windowStart: row.windowStart,
                windowEnd: row.windowEnd,
                computedAt: row.computedAt,
            })
        ).toThrow();
    });

    it('rejects a summary without the window and computedAt keys', () => {
        expect(() =>
            AnalyticAnomalyImpossibleTravelSummaryResponseSchema.parse({
                count: row.count,
                metadata: row.metadata,
            })
        ).toThrow();
    });
});
