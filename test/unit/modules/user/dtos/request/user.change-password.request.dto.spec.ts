import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';

describe('UserChangePasswordRequestSchema', () => {
    const payload = {
        newPassword: 'abcDE12345@@!',
        oldPassword: 'oldPassword1',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserChangePasswordRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no method, code, or backupCode', () => {
        const minimal = {
            newPassword: payload.newPassword,
            oldPassword: payload.oldPassword,
        };

        const result = UserChangePasswordRequestSchema.parse(minimal);

        expect(result).toEqual(minimal);
    });

    it('rejects a newPassword failing the strength regex', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...payload,
                newPassword: 'lowercase12345',
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
