import { FeatureFlagAdminListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import {
    FeatureFlagDefaultAvailableSearch,
    FeatureFlagDefaultAvailableOrderBy,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            FeatureFlagAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableSearch.join(', '));
        expect(
            FeatureFlagAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(FeatureFlagDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            FeatureFlagAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = FeatureFlagDefaultAvailableOrderBy[0];
        const last =
            FeatureFlagDefaultAvailableOrderBy[
                FeatureFlagDefaultAvailableOrderBy.length - 1
            ];

        expect(
            FeatureFlagAdminListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            FeatureFlagAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${FeatureFlagDefaultAvailableOrderBy[0]}:`,
        `${FeatureFlagDefaultAvailableOrderBy[0]}:DESC`,
        `${FeatureFlagDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            FeatureFlagAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
