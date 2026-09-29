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

    it('rejects an undeclared key', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                oldPassword: 'oldPassword1',
            })
        ).toThrow();
    });
});
