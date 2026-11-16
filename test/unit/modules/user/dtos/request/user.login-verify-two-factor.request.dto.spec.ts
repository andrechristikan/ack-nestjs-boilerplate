import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

describe('UserLoginVerifyTwoFactorRequestSchema', () => {
    const payload = {
        challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserLoginVerifyTwoFactorRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no code and no backupCode', () => {
        const { code: _code, backupCode: _backupCode, ...rest } = payload;

        const result = UserLoginVerifyTwoFactorRequestSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('rejects a code with a non-digit character', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                code: 'abc123',
            })
        ).toThrow();
    });

    it('rejects a backupCode with a lowercase character', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                backupCode: 'abcd1234ef',
            })
        ).toThrow();
    });

    it('rejects a method outside EnumAuthTwoFactorMethod', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                method: 'unknownMethod',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                rememberMe: true,
            })
        ).toThrow();
    });

    it('accepts a challengeToken of 128 characters and rejects one of 129', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(128),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(129),
            })
        ).toThrow();
    });

    it('accepts a code of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                code: '1'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                code: '1'.repeat(33),
            })
        ).toThrow();
    });

    it('accepts a backupCode of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                backupCode: 'A'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse({
                ...payload,
                backupCode: 'A'.repeat(33),
            })
        ).toThrow();
    });
});
