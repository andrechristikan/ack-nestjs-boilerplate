import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

describe('AnalyticDateRangeRequestSchema', () => {
    it('coerces ISO strings to Date', () => {
        const result = AnalyticDateRangeRequestSchema.parse({
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-02-01T00:00:00.000Z',
        });

        expect(result.startDate).toEqual(new Date(Date.UTC(2026, 0, 1)));
        expect(result.endDate).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });

    it('rejects a missing endDate', () => {
        expect(() =>
            AnalyticDateRangeRequestSchema.parse({
                startDate: '2026-01-01T00:00:00.000Z',
            })
        ).toThrow();
    });

    it('rejects an invalid date', () => {
        expect(() =>
            AnalyticDateRangeRequestSchema.parse({
                startDate: 'nope',
                endDate: '2026-02-01T00:00:00.000Z',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticDateRangeRequestSchema.parse({
                startDate: '2026-01-01T00:00:00.000Z',
                endDate: '2026-02-01T00:00:00.000Z',
                extra: 1,
            })
        ).toThrow();
    });
});
