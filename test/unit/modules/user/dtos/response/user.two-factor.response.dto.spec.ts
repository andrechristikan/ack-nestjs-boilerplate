import { UserTwoFactorResponseSchema } from '@modules/user/dtos/response/user.two-factor.response.dto';

describe('UserTwoFactorResponseSchema', () => {
    const row = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
        isRequiredSetup: true,
        challengeToken: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
        challengeExpiresInMs: 300000,
        backupCodesRemaining: 8,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTwoFactorResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a row with no secret and no otpauthUrl', () => {
        const { secret: _secret, otpauthUrl: _otpauthUrl, ...rest } = row;

        const result = UserTwoFactorResponseSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('strips an undeclared key', () => {
        const result = UserTwoFactorResponseSchema.parse({
            ...row,
            userId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
