import { FeatureFlagAdminListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

describe('FeatureFlagAdminListRequestSchema', () => {
    it('parses page, perPage, search, and a string orderBy', () => {
        const result = FeatureFlagAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'login',
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'login',
            orderBy: 'latest',
        });
    });

    it('parses an empty query', () => {
        const result = FeatureFlagAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            FeatureFlagAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            FeatureFlagAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            FeatureFlagAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumFeatureFlagOrderBy).join(', '));
    });

    it.each(Object.values(EnumFeatureFlagOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                FeatureFlagAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            FeatureFlagAdminListRequestSchema.safeParse({ orderBy: '' }).success
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
            FeatureFlagAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            FeatureFlagAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
