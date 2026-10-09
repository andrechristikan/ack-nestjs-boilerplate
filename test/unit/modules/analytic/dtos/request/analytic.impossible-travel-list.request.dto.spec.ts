import { AnalyticImpossibleTravelAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';

describe('AnalyticImpossibleTravelListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticImpossibleTravelAvailableOrderBy[0]}:desc`,
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticImpossibleTravelAvailableOrderBy[0]}:desc`,
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

    it('rejects search', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticImpossibleTravelAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticImpossibleTravelAvailableOrderBy[0];
        const last =
            AnalyticImpossibleTravelAvailableOrderBy[
                AnalyticImpossibleTravelAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticImpossibleTravelAvailableOrderBy[0]}:`,
        `${AnalyticImpossibleTravelAvailableOrderBy[0]}:DESC`,
        `${AnalyticImpossibleTravelAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
