import { AnalyticAnomalyDeviceProliferationSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-device-proliferation-summary.response.dto';

describe('AnalyticAnomalyDeviceProliferationSummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: null,
        meta: { avg: 1.5, stdDev: 0.25, zScoreThreshold: 3 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result =
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.parse({
                ...row,
                sessions: [{ id: 'session-1' }],
            });

        expect(result).toEqual(row);
    });

    it('rejects a row without meta', () => {
        expect(() =>
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.parse({
                count: row.count,
                window: row.window,
            })
        ).toThrow();
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.parse({
                count: row.count,
                meta: row.meta,
            })
        ).toThrow();
    });
});
