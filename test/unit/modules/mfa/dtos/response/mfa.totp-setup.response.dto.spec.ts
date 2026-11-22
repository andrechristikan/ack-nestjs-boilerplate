import { MfaTotpSetupResponseSchema } from '@modules/mfa/dtos/response/mfa.totp-setup.response.dto';

describe('MfaTotpSetupResponseSchema', () => {
    const row = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = MfaTotpSetupResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = MfaTotpSetupResponseSchema.parse({
            ...row,
            backupCodes: ['ABCD1234EF'],
        });

        expect(result).toEqual(row);
    });
});
