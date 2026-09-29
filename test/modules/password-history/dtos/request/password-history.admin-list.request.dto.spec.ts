import { PasswordHistoryAdminListRequestSchema } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';

describe('PasswordHistoryAdminListRequestSchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        orderBy: 'createdAt:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'expiredAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'expiredAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PasswordHistoryAdminListRequestSchema.parse({
                ...payload,
                cursor: 'x',
            })
        ).toThrow();
    });
});
