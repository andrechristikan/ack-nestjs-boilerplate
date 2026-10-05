import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';

describe('UserTwoFactorSetupResponseSchema', () => {
    const row = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTwoFactorSetupResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserTwoFactorSetupResponseSchema.parse({
            ...row,
            backupCodes: ['ABCD1234EF'],
        });

        expect(result).toEqual(row);
    });
});
