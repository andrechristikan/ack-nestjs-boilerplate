import { EnumUserSignUpFrom } from '@generated/prisma-client/client';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';

describe('UserSignUpRequestSchema', () => {
    const payload = {
        username: 'developer123',
        email: 'john.doe@example.com',
        name: 'John Doe',
        countryId: '01920000-0000-7000-8000-6cd799439012',
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

    it('accepts an all-lowercase 8-character password', () => {
        const result = UserSignUpRequestSchema.parse({
            ...payload,
            password: 'abcdefgh',
        });

        expect(result.password).toBe('abcdefgh');
    });

    it('accepts a 64-character password', () => {
        const password = 'a'.repeat(64);

        const result = UserSignUpRequestSchema.parse({ ...payload, password });

        expect(result.password).toBe(password);
    });

    it('rejects a 7-character password', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({ ...payload, password: 'abcdefg' })
        ).toThrow();
    });

    it('rejects a 65-character password', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                password: 'a'.repeat(65),
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
                roleId: '01920000-0000-7000-8000-6cd799439011',
            })
        ).toThrow();
    });

    it('accepts a inviteToken of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                inviteToken: 'a'.repeat(200),
            })
        ).not.toThrow();
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...payload,
                inviteToken: 'a'.repeat(201),
            })
        ).toThrow();
    });
});
