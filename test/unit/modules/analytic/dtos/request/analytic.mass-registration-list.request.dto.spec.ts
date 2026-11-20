import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import { EnumAnalyticKeyCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticMassRegistrationListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({
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
        const result = AnalyticMassRegistrationListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({
                windowMs: '600000',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticMassRegistrationListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({ search: 'x' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticKeyCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticKeyCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticMassRegistrationListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({ orderBy: '' })
                .success
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
            AnalyticMassRegistrationListRequestSchema.safeParse({ orderBy })
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
            AnalyticMassRegistrationListRequestSchema.safeParse({
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
