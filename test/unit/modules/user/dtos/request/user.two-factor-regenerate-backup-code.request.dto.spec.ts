import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorRegenerateBackupCodeRequestSchema } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';

describe('UserTwoFactorRegenerateBackupCodeRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result =
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = UserTwoFactorRegenerateBackupCodeRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse({
                password: '',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
