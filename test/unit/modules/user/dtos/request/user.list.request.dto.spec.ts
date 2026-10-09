import { UserListRequestSchema } from '@modules/user/dtos/request/user.list.request.dto';
import {
    UserDefaultAvailableSearch,
    UserDefaultAvailableOrderBy,
} from '@modules/user/constants/user.list.constant';

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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            UserListRequestSchema.shape.search.meta()?.description
        ).toContain(UserDefaultAvailableSearch.join(', '));
        expect(
            UserListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(UserDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = UserDefaultAvailableOrderBy[0];
        const last =
            UserDefaultAvailableOrderBy[UserDefaultAvailableOrderBy.length - 1];

        expect(
            UserListRequestSchema.safeParse({ orderBy: `${first}:asc` }).success
        ).toBe(true);
        expect(
            UserListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${UserDefaultAvailableOrderBy[0]}:`,
        `${UserDefaultAvailableOrderBy[0]}:DESC`,
        `${UserDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(UserListRequestSchema.safeParse({ orderBy }).success).toBe(
            false
        );
    });
});
