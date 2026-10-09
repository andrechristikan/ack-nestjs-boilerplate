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

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            FeatureFlagSystemListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = FeatureFlagDefaultAvailableOrderBy[0];
        const last =
            FeatureFlagDefaultAvailableOrderBy[
                FeatureFlagDefaultAvailableOrderBy.length - 1
            ];

        expect(
            FeatureFlagSystemListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            FeatureFlagSystemListRequestSchema.safeParse({
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
            FeatureFlagSystemListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
