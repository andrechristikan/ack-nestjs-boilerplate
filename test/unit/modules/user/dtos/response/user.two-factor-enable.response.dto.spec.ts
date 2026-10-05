import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';

describe('UserTwoFactorEnableResponseSchema', () => {
    const row = { backupCodes: ['ABCD1234EF', 'ZXCV5678GH'] };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTwoFactorEnableResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserTwoFactorEnableResponseSchema.parse({
            ...row,
            secret: 'JBSWY3DPEHPK3PXP',
        });

        expect(result).toEqual(row);
    });
});
