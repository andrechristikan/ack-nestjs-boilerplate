import { FeatureFlagAdminListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';

describe('FeatureFlagAdminListRequestSchema', () => {
    it('parses page, perPage, search, and a string orderBy', () => {
        const result = FeatureFlagAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'login',
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'login',
            orderBy: 'createdAt:desc',
        });
    });

    it('parses an array orderBy', () => {
        const result = FeatureFlagAdminListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'key:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'key:asc'] });
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
});
