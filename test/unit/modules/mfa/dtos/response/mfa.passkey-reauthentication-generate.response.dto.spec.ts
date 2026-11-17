import { MfaPasskeyReauthenticationGenerateResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-reauthentication-generate.response.dto';

describe('MfaPasskeyReauthenticationGenerateResponseSchema', () => {
    const passkeyOptions = {
        challenge: 'challengeQuartz',
        timeout: 60000,
        rpId: 'example.test',
        allowCredentials: [
            {
                id: 'credential-one',
                type: 'public-key',
                transports: ['internal'],
            },
        ],
        userVerification: 'required',
        hints: [],
    };
    const row = {
        challengeToken: 'token-quartz',
        expiresInMs: 300000,
        passkeyOptions,
    };

    it('parses the token, the lifetime, and the options into exactly the declared fields', () => {
        const result =
            MfaPasskeyReauthenticationGenerateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key of the options', () => {
        const result = MfaPasskeyReauthenticationGenerateResponseSchema.parse({
            ...row,
            passkeyOptions: { ...passkeyOptions, secret: 'x' },
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the challenge of the options', () => {
        const { challenge: _challenge, ...rest } = passkeyOptions;

        const result =
            MfaPasskeyReauthenticationGenerateResponseSchema.safeParse({
                ...row,
                passkeyOptions: rest,
            });

        expect(result.success).toBe(false);
    });

    it('rejects null options', () => {
        const result =
            MfaPasskeyReauthenticationGenerateResponseSchema.safeParse({
                ...row,
                passkeyOptions: null,
            });

        expect(result.success).toBe(false);
    });
});
