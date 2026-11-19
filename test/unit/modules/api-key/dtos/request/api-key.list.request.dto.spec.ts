import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyListRequestSchema } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import { ApiKeyDefaultAvailableSearch } from '@modules/api-key/constants/api-key.list.constant';
import { EnumApiKeyOrderBy } from '@modules/api-key/enums/api-key.enum';

describe('ApiKeyListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, isActive, and type', () => {
        const result = ApiKeyListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
            isActive: 'true',
            type: EnumApiKeyType.default,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
            isActive: true,
            type: EnumApiKeyType.default,
        });
    });

    it('parses with no field set', () => {
        const result = ApiKeyListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an isActive value other than true or false', () => {
        expect(() =>
            ApiKeyListRequestSchema.parse({ isActive: 'yes' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() => ApiKeyListRequestSchema.parse({ extra: true })).toThrow();
    });

    it('accepts a type of 256 characters and rejects one of 257', () => {
        expect(() =>
            ApiKeyListRequestSchema.parse({ type: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            ApiKeyListRequestSchema.parse({ type: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            ApiKeyListRequestSchema.shape.search.meta()?.description
        ).toContain(ApiKeyDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ApiKeyListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumApiKeyOrderBy).join(', '));
    });

    it.each(Object.values(EnumApiKeyOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(ApiKeyListRequestSchema.safeParse({ orderBy }).success).toBe(
                true
            );
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(ApiKeyListRequestSchema.safeParse({ orderBy: '' }).success).toBe(
            true
        );
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(ApiKeyListRequestSchema.safeParse({ orderBy }).success).toBe(
            false
        );
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ApiKeyListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
