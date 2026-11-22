import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaTotpDisableRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-disable.request.dto';

describe('MfaTotpDisableRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result = MfaTotpDisableRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = MfaTotpDisableRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            MfaTotpDisableRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            MfaTotpDisableRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
