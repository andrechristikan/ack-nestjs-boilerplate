import { AnalyticAnomalyDeviceProliferationSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-device-proliferation-summary.response.dto';

describe('AnalyticAnomalyDeviceProliferationSummaryResponseSchema', () => {
    const row = {
        count: 4,
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2026-01-02T00:00:00.000Z'),
        computedAt: new Date('2026-01-02T00:00:05.000Z'),
        metadata: { avg: 1.5, stdDev: 0.25, zScoreThreshold: 3 },
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

    it('rejects a row without metadata', () => {
        const result =
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.safeParse({
                count: row.count,
                windowStart: row.windowStart,
                windowEnd: row.windowEnd,
                computedAt: row.computedAt,
            });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a summary without the window and computedAt keys', () => {
        const result =
            AnalyticAnomalyDeviceProliferationSummaryResponseSchema.safeParse({
                count: row.count,
                metadata: row.metadata,
            });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['windowStart'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['windowEnd'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });
});
