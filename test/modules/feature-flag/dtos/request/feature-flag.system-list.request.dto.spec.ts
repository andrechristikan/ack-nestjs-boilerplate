import { FeatureFlagSystemListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';

describe('FeatureFlagSystemListRequestSchema', () => {
    it('parses cursor, perPage, search, and a string orderBy', () => {
        const result = FeatureFlagSystemListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'login',
            orderBy: 'key:asc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'login',
            orderBy: 'key:asc',
        });
    });

    it('parses an array orderBy', () => {
        const result = FeatureFlagSystemListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'key:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'key:asc'] });
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
});
