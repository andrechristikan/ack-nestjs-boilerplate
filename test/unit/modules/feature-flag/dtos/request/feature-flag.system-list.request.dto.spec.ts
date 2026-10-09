import { FeatureFlagSystemListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import {
    FeatureFlagDefaultAvailableSearch,
    FeatureFlagDefaultAvailableOrderBy,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            FeatureFlagSystemListRequestSchema.shape.search.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableSearch.join(', '));
        expect(
            FeatureFlagSystemListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableOrderBy.join(', '));
    });
});
