import { AnalyticForgotPasswordAbuseAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';

describe('AnalyticForgotPasswordAbuseListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticForgotPasswordAbuseListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticForgotPasswordAbuseAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticForgotPasswordAbuseAvailableOrderBy[0];
        const last =
            AnalyticForgotPasswordAbuseAvailableOrderBy[
                AnalyticForgotPasswordAbuseAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:`,
        `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:DESC`,
        `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
