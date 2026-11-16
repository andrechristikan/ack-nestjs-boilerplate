import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';

describe('UserForgotPasswordResetRequestSchema', () => {
    const payload = {
        newPassword: 'abcDE12345@@!',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
        token: 'a1b2c3d4e5f6g7h8i9j0',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserForgotPasswordResetRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no method, code, or backupCode', () => {
        const minimal = {
            newPassword: payload.newPassword,
            token: payload.token,
        };

        const result = UserForgotPasswordResetRequestSchema.parse(minimal);

        expect(result).toEqual(minimal);
    });

    it('rejects a payload with no token', () => {
        const { token: _token, ...rest } = payload;

        expect(() =>
            UserForgotPasswordResetRequestSchema.parse(rest)
        ).toThrow();
    });

    it('accepts an all-lowercase 8-character newPassword', () => {
        const result = UserForgotPasswordResetRequestSchema.parse({
            ...payload,
            newPassword: 'abcdefgh',
        });

        expect(result.newPassword).toBe('abcdefgh');
    });

    it('accepts a 64-character newPassword', () => {
        const newPassword = 'a'.repeat(64);

        const result = UserForgotPasswordResetRequestSchema.parse({
            ...payload,
            newPassword,
        });

        expect(result.newPassword).toBe(newPassword);
    });

    it('rejects a 7-character newPassword', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                newPassword: 'abcdefg',
            })
        ).toThrow();
    });

    it('rejects a 65-character newPassword', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                newPassword: 'a'.repeat(65),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                oldPassword: 'oldPassword1',
            })
        ).toThrow();
    });

    it('accepts a token of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                token: 'a'.repeat(200),
            })
        ).not.toThrow();
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                token: 'a'.repeat(201),
            })
        ).toThrow();
    });
});
