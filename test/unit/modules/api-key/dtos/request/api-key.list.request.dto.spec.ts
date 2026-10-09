import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyListRequestSchema } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import {
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultAvailableOrderBy,
} from '@modules/api-key/constants/api-key.list.constant';

describe('ApiKeyListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, isActive, and type', () => {
        const result = ApiKeyListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
            isActive: 'true',
            type: EnumApiKeyType.default,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            ApiKeyListRequestSchema.shape.search.meta()?.description
        ).toContain(ApiKeyDefaultAvailableSearch.join(', '));
        expect(
            ApiKeyListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ApiKeyDefaultAvailableOrderBy.join(', '));
    });
});
