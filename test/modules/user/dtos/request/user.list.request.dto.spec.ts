import { UserListRequestSchema } from '@modules/user/dtos/request/user.list.request.dto';

describe('UserListRequestSchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        search: 'john',
        orderBy: 'createdAt:desc',
        status: 'active,inactive',
        roleId: '507f1f77bcf86cd799439011',
        countryId: '507f1f77bcf86cd799439012',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload', () => {
        const result = UserListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a roleId that is not a Mongo id', () => {
        expect(() =>
            UserListRequestSchema.parse({ ...payload, roleId: 'not-an-id' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserListRequestSchema.parse({ ...payload, name: 'john' })
        ).toThrow();
    });
});
