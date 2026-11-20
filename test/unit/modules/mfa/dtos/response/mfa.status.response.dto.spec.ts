import { MfaStatusResponseSchema } from '@modules/mfa/dtos/response/mfa.status.response.dto';

describe('MfaStatusResponseSchema', () => {
    const confirmedAt = new Date('2026-01-01T00:00:00.000Z');
    const lastUsedAt = new Date('2026-02-01T00:00:00.000Z');

    const row = {
        isEnabled: true,
        backupCodesRemaining: 8,
        totp: {
            isEnabled: true,
            isPendingConfirmation: false,
            confirmedAt,
            lastUsedAt,
        },
        passkeys: [
            {
                id: 'passkey-one',
                name: 'iPhone',
                deviceType: 'multiDevice',
                backedUp: true,
                createdAt: confirmedAt,
                lastUsedAt: null,
            },
        ],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = MfaStatusResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null confirmedAt and lastUsedAt', () => {
        const nullRow = {
            ...row,
            totp: { ...row.totp, confirmedAt: null, lastUsedAt: null },
        };

        const result = MfaStatusResponseSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('parses an empty passkey list', () => {
        const emptyRow = { ...row, passkeys: [] };

        const result = MfaStatusResponseSchema.parse(emptyRow);

        expect(result).toEqual(emptyRow);
    });

    it('strips the credential of a passkey', () => {
        const result = MfaStatusResponseSchema.parse({
            ...row,
            passkeys: [{ ...row.passkeys[0], credentialId: 'credential-one' }],
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the passkeys', () => {
        const { passkeys: _passkeys, ...rest } = row;

        const result = MfaStatusResponseSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeys'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('strips an undeclared key', () => {
        const result = MfaStatusResponseSchema.parse({
            ...row,
            secret: 'JBSWY3DPEHPK3PXP',
            totp: { ...row.totp, secret: 'JBSWY3DPEHPK3PXP' },
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the totp object', () => {
        const { totp: _totp, ...rest } = row;

        const result = MfaStatusResponseSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['totp'], code: 'invalid_type' }),
        ]);
    });
});
