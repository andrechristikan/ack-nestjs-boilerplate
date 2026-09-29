import { UserTwoFactorStatusResponseSchema } from '@modules/user/dtos/response/user.two-factor-status.response.dto';

describe('UserTwoFactorStatusResponseSchema', () => {
    const confirmedAt = new Date('2026-01-01T00:00:00.000Z');
    const lastUsedAt = new Date('2026-02-01T00:00:00.000Z');

    const row = {
        isEnabled: true,
        isPendingConfirmation: false,
        backupCodesRemaining: 8,
        confirmedAt,
        lastUsedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTwoFactorStatusResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null confirmedAt and lastUsedAt', () => {
        const nullRow = { ...row, confirmedAt: null, lastUsedAt: null };

        const result = UserTwoFactorStatusResponseSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('strips an undeclared key', () => {
        const result = UserTwoFactorStatusResponseSchema.parse({
            ...row,
            secret: 'JBSWY3DPEHPK3PXP',
        });

        expect(result).toEqual(row);
    });
});
