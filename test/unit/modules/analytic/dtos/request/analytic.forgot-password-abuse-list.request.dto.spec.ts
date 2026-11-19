import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import { EnumAnalyticForgotPasswordAbuseOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticForgotPasswordAbuseListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostTokens',
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostTokens',
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticForgotPasswordAbuseOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticForgotPasswordAbuseOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'mostTokens:asc',
        'default',
        'createdAt',
        'tokenCount',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: ['mostTokens', 'mostTokens'],
            }).success
        ).toBe(false);
    });
});
