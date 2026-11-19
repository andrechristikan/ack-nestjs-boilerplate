import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import { EnumAnalyticKeyCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticMassRegistrationListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticMassRegistrationListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
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
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({
                orderBy: ['mostCount', 'mostCount'],
            }).success
        ).toBe(false);
    });
});
