import { AnalyticProjectsMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticProjectsMembershipListRequestSchema', () => {
    it('parses page and perPage', () => {
        const result = AnalyticProjectsMembershipListRequestSchema.parse({
            page: 1,
            perPage: 20,
        });

        expect(result).toEqual({ page: 1, perPage: 20 });
    });

    it('parses an empty object', () => {
        const result = AnalyticProjectsMembershipListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticProjectsMembershipListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticProjectsMembershipListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('parses a sent orderBy', () => {
        const result = AnalyticProjectsMembershipListRequestSchema.parse({
            orderBy: 'mostCount',
        });

        expect(result).toMatchObject({ orderBy: 'mostCount' });
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticProjectsMembershipListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticProjectsMembershipListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticProjectsMembershipListRequestSchema.safeParse({
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
            AnalyticProjectsMembershipListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticProjectsMembershipListRequestSchema.safeParse({
                orderBy: ['mostCount', 'mostCount'],
            }).success
        ).toBe(false);
    });
});
