import { PasswordHistorySharedListRequestSchema } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';

describe('PasswordHistorySharedListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'createdAt:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistorySharedListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistorySharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = PasswordHistorySharedListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PasswordHistorySharedListRequestSchema.parse({
                ...payload,
                page: 1,
            })
        ).toThrow();
    });
});
