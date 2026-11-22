import { MfaPasskeyResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey.response.dto';

describe('MfaPasskeyResponseSchema', () => {
    const row = {
        id: 'passkey-one',
        name: 'iPhone',
        deviceType: 'multiDevice',
        backedUp: true,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        lastUsedAt: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = MfaPasskeyResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a last use date', () => {
        const used = {
            ...row,
            lastUsedAt: new Date('2026-03-02T00:00:00.000Z'),
        };

        const result = MfaPasskeyResponseSchema.parse(used);

        expect(result).toEqual(used);
    });

    it('strips the credential, the public key, and the counter', () => {
        const result = MfaPasskeyResponseSchema.parse({
            ...row,
            credentialId: 'credential-one',
            publicKey: 'publicKeyQuartz',
            counter: 3,
            userId: 'user-quartz',
        });

        expect(result).toEqual(row);
    });

    it('rejects a device type outside the enum', () => {
        const result = MfaPasskeyResponseSchema.safeParse({
            ...row,
            deviceType: 'cloud',
        });

        expect(result.success).toBe(false);
    });
});
