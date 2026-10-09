import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

describe('UserCreateRequestSchema', () => {
    const payload = {
        username: 'developer123',
        email: 'john.doe@example.com',
        roleId: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        countryId: '507f1f77bcf86cd799439012',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no name', () => {
        const { name: _name, ...rest } = payload;

        const result = UserCreateRequestSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('rejects an email failing the custom email validation with its message path', () => {
        const result = UserCreateRequestSchema.safeParse({
            ...payload,
            email: 'not-an-email',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                code: 'custom',
                path: ['email'],
                message: 'request.error.email.invalid',
            }),
        ]);
    });

    it('rejects a roleId that is not a Mongo id', () => {
        expect(() =>
            UserCreateRequestSchema.parse({ ...payload, roleId: 'not-an-id' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserCreateRequestSchema.parse({ ...payload, isAdmin: true })
        ).toThrow();
    });
});
