import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

describe('AnalyticDateRangeRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const payload = { startDate, endDate };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticDateRangeRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticDateRangeRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual(payload);
    });

    it('rejects a payload missing startDate', () => {
        const result = AnalyticDateRangeRequestSchema.safeParse({ endDate });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['startDate'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a payload missing endDate', () => {
        const result = AnalyticDateRangeRequestSchema.safeParse({ startDate });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['endDate'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticDateRangeRequestSchema.safeParse({
            ...payload,
            windowMs: 3600000,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
