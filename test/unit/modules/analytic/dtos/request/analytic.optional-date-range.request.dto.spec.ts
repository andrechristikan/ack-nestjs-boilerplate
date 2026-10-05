import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';

describe('AnalyticOptionalDateRangeRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const payload = { startDate, endDate };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticOptionalDateRangeRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when both dates are omitted', () => {
        const result = AnalyticOptionalDateRangeRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticOptionalDateRangeRequestSchema.parse({
                ...payload,
                windowMs: 3600000,
            })
        ).toThrow();
    });
});
