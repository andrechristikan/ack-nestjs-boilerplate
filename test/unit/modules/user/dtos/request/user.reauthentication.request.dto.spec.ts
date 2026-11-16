import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

describe('UserReauthenticationRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result = UserReauthenticationRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = UserReauthenticationRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });

    it('accepts a password of 64 characters and rejects one of 65', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                password: 'a'.repeat(64),
            })
        ).not.toThrow();
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                password: 'a'.repeat(65),
            })
        ).toThrow();
    });

    it('accepts a otp of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                otp: '1'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                otp: '1'.repeat(33),
            })
        ).toThrow();
    });
});
