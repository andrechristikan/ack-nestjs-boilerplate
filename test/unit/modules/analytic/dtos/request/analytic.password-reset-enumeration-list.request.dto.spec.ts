import { AnalyticKeyCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';

describe('AnalyticPasswordResetEnumerationListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticKeyCountAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticKeyCountAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse(
            {}
        );

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticPasswordResetEnumerationListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticKeyCountAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticKeyCountAvailableOrderBy[0];
        const last =
            AnalyticKeyCountAvailableOrderBy[
                AnalyticKeyCountAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticKeyCountAvailableOrderBy[0]}:`,
        `${AnalyticKeyCountAvailableOrderBy[0]}:DESC`,
        `${AnalyticKeyCountAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy,
            }).success
        ).toBe(false);
    });
});
