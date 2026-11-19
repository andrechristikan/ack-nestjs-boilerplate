import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

describe('AnalyticAnomalySummaryResponseSchema', () => {
    const windowStart = new Date('2026-01-01T00:00:00.000Z');
    const windowEnd = new Date('2026-01-02T00:00:00.000Z');
    const computedAt = new Date('2026-01-02T00:00:05.000Z');
    const summary = { count: 1, windowStart, windowEnd, computedAt };

    it('parses a summary into exactly the declared fields', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse(summary);

        expect(result).toEqual(summary);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse({
            ...summary,
            metadata: { avg: 1 },
            sessions: [{ id: 'session-1' }],
        });

        expect(result).toEqual(summary);
    });

    it.each(['windowStart', 'windowEnd', 'computedAt'])(
        'rejects a summary without the %s key',
        key => {
            const { [key]: _omitted, ...rest } = summary as Record<
                string,
                unknown
            >;

            expect(() =>
                AnalyticAnomalySummaryResponseSchema.parse(rest)
            ).toThrow();
        }
    );

    it('parses windowStart, windowEnd, and computedAt as null', () => {
        const result = AnalyticAnomalySummaryResponseSchema.parse({
            count: 0,
            windowStart: null,
            windowEnd: null,
            computedAt: null,
        });

        expect(result).toEqual({
            count: 0,
            windowStart: null,
            windowEnd: null,
            computedAt: null,
        });
    });

    it('rejects the former window string', () => {
        expect(() =>
            AnalyticAnomalySummaryResponseSchema.parse({
                ...summary,
                windowStart: '3600000',
            })
        ).toThrow();
    });
});
