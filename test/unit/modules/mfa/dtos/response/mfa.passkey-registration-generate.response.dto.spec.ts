import { MfaPasskeyRegistrationGenerateResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-registration-generate.response.dto';

describe('MfaPasskeyRegistrationGenerateResponseSchema', () => {
    const passkeyOptions = {
        challenge: 'challengeQuartz',
        rp: { name: 'Ack', id: 'example.test' },
        user: {
            id: 'userHandleQuartz',
            name: 'quartz@example.test',
            displayName: 'quartz',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [
            {
                id: 'credential-one',
                type: 'public-key',
                transports: ['internal'],
            },
        ],
        authenticatorSelection: {
            residentKey: 'required',
            requireResidentKey: true,
            userVerification: 'required',
        },
        extensions: { credProps: true },
        hints: [],
    };
    const row = {
        challengeToken: 'token-quartz',
        expiresInMs: 300000,
        passkeyOptions,
    };

    it('parses the token, the lifetime, and the options into exactly the declared fields', () => {
        const result = MfaPasskeyRegistrationGenerateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key of the options', () => {
        const result = MfaPasskeyRegistrationGenerateResponseSchema.parse({
            ...row,
            passkeyOptions: { ...passkeyOptions, secret: 'x' },
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the challenge of the options', () => {
        const { challenge: _challenge, ...rest } = passkeyOptions;

        const result = MfaPasskeyRegistrationGenerateResponseSchema.safeParse({
            ...row,
            passkeyOptions: rest,
        });

        expect(result.success).toBe(false);
    });
});
