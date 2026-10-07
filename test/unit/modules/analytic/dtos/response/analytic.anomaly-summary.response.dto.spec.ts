import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

describe('AnalyticAnomalySummaryResponseSchema', () => {
    const summary = { count: 1, window: 'window-token' };

    it('parses a summary into exactly the declared fields', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse(summary);

        expect(result).toEqual(summary);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse({
            ...summary,
            meta: { avg: 1 },
            sessions: [{ id: 'session-1' }],
        });

        expect(result).toEqual(summary);
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticAnomalySummaryResponseSchema.parse({ count: 1 })
        ).toThrow();
    });

    it('accepts a null window', () => {
        expect(
            AnalyticAnomalySummaryResponseSchema.parse({
                ...summary,
                window: null,
            })
        ).toEqual({ ...summary, window: null });
    });
});
