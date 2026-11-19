import { AnalyticWorkspacesMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspaces-membership-list.request.dto';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticWorkspacesMembershipListRequestSchema', () => {
    it('parses page and perPage', () => {
        const result = AnalyticWorkspacesMembershipListRequestSchema.parse({
            page: 1,
            perPage: 20,
        });

        expect(result).toEqual({ page: 1, perPage: 20 });
    });

    it('parses an empty object', () => {
        const result = AnalyticWorkspacesMembershipListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticWorkspacesMembershipListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticWorkspacesMembershipListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('parses a sent orderBy', () => {
        const result = AnalyticWorkspacesMembershipListRequestSchema.parse({
            orderBy: 'mostCount',
        });

        expect(result).toMatchObject({ orderBy: 'mostCount' });
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticWorkspacesMembershipListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticWorkspacesMembershipListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticWorkspacesMembershipListRequestSchema.safeParse({
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
            AnalyticWorkspacesMembershipListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticWorkspacesMembershipListRequestSchema.safeParse({
                orderBy: ['mostCount', 'mostCount'],
            }).success
        ).toBe(false);
    });
});
