import { AnalyticSessionAfterAdminAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticSessionAfterAdminListRequestSchema } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';

describe('AnalyticSessionAfterAdminListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticSessionAfterAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:desc`,
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:desc`,
            startDate,
            endDate,
        });
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticSessionAfterAdminListRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual({ startDate, endDate });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticSessionAfterAdminListRequestSchema.parse({
                startDate,
                endDate,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                search: 'x',
                startDate,
                endDate,
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticSessionAfterAdminAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticSessionAfterAdminAvailableOrderBy[0];
        const last =
            AnalyticSessionAfterAdminAvailableOrderBy[
                AnalyticSessionAfterAdminAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:`,
        `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:DESC`,
        `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                startDate,
                endDate,
                orderBy,
            }).success
        ).toBe(false);
    });
});
