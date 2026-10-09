import { UserTwoFactorRegenerateBackupCodeRequestSchema } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';

describe('UserTwoFactorRegenerateBackupCodeRequestSchema', () => {
    const payload = { code: '654321' };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a code with a non-digit character', () => {
        expect(() =>
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse({
                code: 'abc123',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse({
                ...payload,
                backupCode: 'ABCD1234EF',
            })
        ).toThrow();
    });
});
