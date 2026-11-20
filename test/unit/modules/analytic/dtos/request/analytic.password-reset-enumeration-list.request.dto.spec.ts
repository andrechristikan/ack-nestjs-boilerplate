import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import { EnumAnalyticKeyCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticPasswordResetEnumerationListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse(
            {}
        );

        expect(result).toEqual({});
    });

    it('rejects windowMs', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                windowMs: '600000',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result =
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                page: 1,
                extra: true,
            });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                search: 'x',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticKeyCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticKeyCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'mostCount:asc',
        'default',
        'createdAt',
        'count',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticPasswordResetEnumerationListRequestSchema.safeParse({
                orderBy: ['mostCount', 'mostCount'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
