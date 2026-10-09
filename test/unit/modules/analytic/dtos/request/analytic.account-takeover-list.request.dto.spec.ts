import { AnalyticAccountTakeoverAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';

describe('AnalyticAccountTakeoverListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticAccountTakeoverAvailableOrderBy[0]}:desc`,
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticAccountTakeoverAvailableOrderBy[0]}:desc`,
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

    it('rejects search', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                search: 'x',
                startDate,
                endDate,
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticAccountTakeoverAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticAccountTakeoverAvailableOrderBy[0];
        const last =
            AnalyticAccountTakeoverAvailableOrderBy[
                AnalyticAccountTakeoverAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticAccountTakeoverAvailableOrderBy[0]}:`,
        `${AnalyticAccountTakeoverAvailableOrderBy[0]}:DESC`,
        `${AnalyticAccountTakeoverAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy,
            }).success
        ).toBe(false);
    });
});
