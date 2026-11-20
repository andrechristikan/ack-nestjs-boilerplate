import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaPasskeyDeleteRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-delete.request.dto';

describe('MfaPasskeyDeleteRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result = MfaPasskeyDeleteRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = MfaPasskeyDeleteRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        const result = MfaPasskeyDeleteRequestSchema.safeParse({
            password: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['password'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = MfaPasskeyDeleteRequestSchema.safeParse({
            ...payload,
            challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
