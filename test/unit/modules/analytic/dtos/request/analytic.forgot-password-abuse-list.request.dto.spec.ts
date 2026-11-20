import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import { EnumAnalyticForgotPasswordAbuseOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticForgotPasswordAbuseListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostTokens',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostTokens',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                windowMs: '600000',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                search: 'x',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
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
                .error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticForgotPasswordAbuseListRequestSchema.safeParse({
                orderBy: ['mostTokens', 'mostTokens'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
