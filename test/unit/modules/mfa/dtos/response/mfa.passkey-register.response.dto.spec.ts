import { MfaPasskeyRegisterResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-register.response.dto';

describe('MfaPasskeyRegisterResponseSchema', () => {
    const passkey = {
        id: 'passkey-one',
        name: 'iPhone',
        deviceType: 'multiDevice',
        backedUp: true,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        lastUsedAt: null,
    };

    it('parses the passkey with the backup codes', () => {
        const row = { passkey, backupCodes: ['ABCD1234EF'] };

        const result = MfaPasskeyRegisterResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null backup codes', () => {
        const row = { passkey, backupCodes: null };

        const result = MfaPasskeyRegisterResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a row without the passkey', () => {
        const result = MfaPasskeyRegisterResponseSchema.safeParse({
            backupCodes: null,
        });

        expect(result.success).toBe(false);
    });
});
