import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic-impossible-travel-list.request.dto';

describe('AnalyticImpossibleTravelListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.parse({
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

    it('parses an empty object when dates are omitted', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual({ startDate, endDate });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticImpossibleTravelListRequestSchema.parse({
                startDate,
                endDate,
                extra: true,
            })
        ).toThrow();
    });
});
