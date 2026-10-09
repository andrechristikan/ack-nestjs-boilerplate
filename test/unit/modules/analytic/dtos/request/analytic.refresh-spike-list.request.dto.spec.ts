import { AnalyticUserCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticRefreshSpikeListRequestSchema } from '@modules/analytic/dtos/request/analytic.refresh-spike-list.request.dto';

describe('AnalyticRefreshSpikeListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticUserCountAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticUserCountAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticRefreshSpikeListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticUserCountAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticUserCountAvailableOrderBy[0];
        const last =
            AnalyticUserCountAvailableOrderBy[
                AnalyticUserCountAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticUserCountAvailableOrderBy[0]}:`,
        `${AnalyticUserCountAvailableOrderBy[0]}:DESC`,
        `${AnalyticUserCountAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
