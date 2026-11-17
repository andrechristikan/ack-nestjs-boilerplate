import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaTotpSetupRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-setup.request.dto';

describe('MfaTotpSetupRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the password, backup code, and email code into exactly the declared fields', () => {
        const result = MfaTotpSetupRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = MfaTotpSetupRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            MfaTotpSetupRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('accepts the method and the code as the MFA proof', () => {
        const proof = {
            ...payload,
            method: EnumMfaMethod.totp,
            code: '654321',
        };

        const result = MfaTotpSetupRequestSchema.parse(proof);

        expect(result).toEqual(proof);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            MfaTotpSetupRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
