import { MfaBackupCodesResponseSchema } from '@modules/mfa/dtos/response/mfa.backup-codes.response.dto';

describe('MfaBackupCodesResponseSchema', () => {
    const row = { backupCodes: ['ABCD1234EF', 'ZXCV5678GH'] };

    it('parses a row into exactly the declared fields', () => {
        const result = MfaBackupCodesResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null backup codes', () => {
        const result = MfaBackupCodesResponseSchema.parse({
            backupCodes: null,
        });

        expect(result).toEqual({ backupCodes: null });
    });

    it('strips an undeclared key', () => {
        const result = MfaBackupCodesResponseSchema.parse({
            ...row,
            secret: 'JBSWY3DPEHPK3PXP',
        });

        expect(result).toEqual(row);
    });
});
