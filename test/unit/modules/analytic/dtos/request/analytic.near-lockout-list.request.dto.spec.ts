import { AnalyticNearLockoutListRequestSchema } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import { EnumAnalyticNearLockoutOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticNearLockoutListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticNearLockoutListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticNearLockoutListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticNearLockoutListRequestSchema.parse({ page: 1, extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticNearLockoutListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticNearLockoutListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticNearLockoutOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticNearLockoutOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticNearLockoutListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticNearLockoutListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticNearLockoutListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticNearLockoutListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
