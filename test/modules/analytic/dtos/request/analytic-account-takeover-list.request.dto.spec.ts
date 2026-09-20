import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic-account-takeover-list.request.dto';

describe('AnalyticAccountTakeoverListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            startDate,
            endDate,
        });
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual({ startDate, endDate });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticAccountTakeoverListRequestSchema.parse({
                startDate,
                endDate,
                extra: true,
            })
        ).toThrow();
    });
});
