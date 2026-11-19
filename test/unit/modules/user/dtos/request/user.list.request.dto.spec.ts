import { UserListRequestSchema } from '@modules/user/dtos/request/user.list.request.dto';
import { UserDefaultAvailableSearch } from '@modules/user/constants/user.list.constant';
import { EnumUserOrderBy } from '@modules/user/enums/user.enum';

describe('UserListRequestSchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        search: 'john',
        orderBy: 'latest',
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

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            UserListRequestSchema.parse({ status: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            UserListRequestSchema.parse({ status: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            UserListRequestSchema.shape.search.meta()?.description
        ).toContain(UserDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            UserListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumUserOrderBy).join(', '));
    });

    it.each(Object.values(EnumUserOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(UserListRequestSchema.safeParse({ orderBy }).success).toBe(
                true
            );
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(UserListRequestSchema.safeParse({ orderBy: '' }).success).toBe(
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
        expect(UserListRequestSchema.safeParse({ orderBy }).success).toBe(
            false
        );
    });

    it('rejects a repeated orderBy', () => {
        expect(
            UserListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
