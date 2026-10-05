import { EnumUserSignUpFrom } from '@generated/prisma-client/client';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';

describe('UserSignUpRequestSchema', () => {
    const payload = {
        username: 'developer123',
        email: 'john.doe@example.com',
        name: 'John Doe',
        countryId: '507f1f77bcf86cd799439012',
        password: 'abcDE12345@@!',
        marketing: true,
        cookies: true,
        from: EnumUserSignUpFrom.mobile,
        inviteToken: 'a1b2c3d4e5',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserSignUpRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no inviteToken', () => {
        const { inviteToken: _inviteToken, ...rest } = payload;

        const result = UserSignUpRequestSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('rejects a password failing the strength regex', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                password: 'lowercase12345',
            })
        ).toThrow();
    });

    it('rejects a sign-up origin outside mobile and website', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                from: EnumUserSignUpFrom.admin,
            })
        ).toThrow();
    });

    it('rejects an undeclared roleId key', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                roleId: '507f1f77bcf86cd799439011',
            })
        ).toThrow();
    });
});
