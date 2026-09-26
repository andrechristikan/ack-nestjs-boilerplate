import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';

describe('AnalyticOptionalDateRangeRequestSchema', () => {
    it('parses an empty object', () => {
        expect(AnalyticOptionalDateRangeRequestSchema.parse({})).toEqual({});
    });

    it('coerces provided dates', () => {
        const result = AnalyticOptionalDateRangeRequestSchema.parse({
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-02-01T00:00:00.000Z',
        });

        expect(result.startDate).toEqual(new Date(Date.UTC(2026, 0, 1)));
        expect(result.endDate).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });

    it('rejects an invalid date', () => {
        expect(() =>
            AnalyticOptionalDateRangeRequestSchema.parse({ startDate: 'nope' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticOptionalDateRangeRequestSchema.parse({ extra: 1 })
        ).toThrow();
    });
});
