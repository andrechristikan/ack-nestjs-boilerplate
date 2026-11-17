import { MfaPasskeyUpdateRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-update.request.dto';

describe('MfaPasskeyUpdateRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const result = MfaPasskeyUpdateRequestSchema.parse({ name: 'Laptop' });

        expect(result).toEqual({ name: 'Laptop' });
    });

    it('trims the name', () => {
        const result = MfaPasskeyUpdateRequestSchema.parse({
            name: '  Laptop  ',
        });

        expect(result).toEqual({ name: 'Laptop' });
    });

    it('rejects a missing, blank, and 51-character name', () => {
        expect(MfaPasskeyUpdateRequestSchema.safeParse({}).success).toBe(false);
        expect(
            MfaPasskeyUpdateRequestSchema.safeParse({ name: '   ' }).success
        ).toBe(false);
        expect(
            MfaPasskeyUpdateRequestSchema.safeParse({ name: 'a'.repeat(51) })
                .success
        ).toBe(false);
    });

    it('rejects an undeclared key', () => {
        const result = MfaPasskeyUpdateRequestSchema.safeParse({
            name: 'Laptop',
            id: 'x',
        });

        expect(result.success).toBe(false);
    });
});
