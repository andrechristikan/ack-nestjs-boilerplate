import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';

describe('UserChangePasswordRequestSchema', () => {
    const payload = {
        newPassword: 'abcDE12345@@!',
        password: 'oldPassword1',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserChangePasswordRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no method, code, or backupCode', () => {
        const minimal = {
            newPassword: payload.newPassword,
            password: payload.password,
        };

        const result = UserChangePasswordRequestSchema.parse(minimal);

        expect(result).toEqual(minimal);
    });

    it('accepts a payload without password', () => {
        const result = UserChangePasswordRequestSchema.parse({
            newPassword: payload.newPassword,
        });

        expect(result).toEqual({ newPassword: payload.newPassword });
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...payload,
                password: '',
            })
        ).toThrow();
    });

    it('rejects oldPassword as an undeclared key', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                newPassword: payload.newPassword,
                oldPassword: 'oldPassword1',
            })
        ).toThrow();
    });

    it('accepts an all-lowercase 8-character newPassword', () => {
        const result = UserChangePasswordRequestSchema.parse({
            ...payload,
            newPassword: 'abcdefgh',
        });

        expect(result.newPassword).toBe('abcdefgh');
    });

    it('accepts a 64-character newPassword', () => {
        const newPassword = 'a'.repeat(64);

        const result = UserChangePasswordRequestSchema.parse({
            ...payload,
            newPassword,
        });

        expect(result.newPassword).toBe(newPassword);
    });

    it('rejects a 7-character newPassword', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...payload,
                newPassword: 'abcdefg',
            })
        ).toThrow();
    });

    it('rejects a 65-character newPassword', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...payload,
                newPassword: 'a'.repeat(65),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
