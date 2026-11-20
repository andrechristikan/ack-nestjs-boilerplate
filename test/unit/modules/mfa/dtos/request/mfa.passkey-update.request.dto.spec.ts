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
        expect(
            MfaPasskeyUpdateRequestSchema.safeParse({}).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
        expect(
            MfaPasskeyUpdateRequestSchema.safeParse({ name: '   ' }).error
                ?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
        expect(
            MfaPasskeyUpdateRequestSchema.safeParse({ name: 'a'.repeat(51) })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = MfaPasskeyUpdateRequestSchema.safeParse({
            name: 'Laptop',
            id: 'x',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
