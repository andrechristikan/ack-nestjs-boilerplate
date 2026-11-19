import { FeatureFlagSystemListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

describe('FeatureFlagSystemListRequestSchema', () => {
    it('parses cursor, perPage, search, and a string orderBy', () => {
        const result = FeatureFlagSystemListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'login',
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'login',
            orderBy: 'latest',
        });
    });

    it('parses an empty query', () => {
        const result = FeatureFlagSystemListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            FeatureFlagSystemListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            FeatureFlagSystemListRequestSchema.shape.search.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            FeatureFlagSystemListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumFeatureFlagOrderBy).join(', '));
    });

    it.each(Object.values(EnumFeatureFlagOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                FeatureFlagSystemListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            FeatureFlagSystemListRequestSchema.safeParse({ orderBy: '' })
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
            FeatureFlagSystemListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            FeatureFlagSystemListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
