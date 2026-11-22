import { MfaPasskeyRegistrationResponseSchema } from '@modules/mfa/validations/mfa.passkey-registration-response.validation';

describe('MfaPasskeyRegistrationResponseSchema', () => {
    const base = {
        id: 'AbC_-123',
        rawId: 'AbC_-123',
        response: {
            clientDataJSON: 'clientDataQuartz',
            attestationObject: 'attestationQuartz',
        },
        clientExtensionResults: {},
        type: 'public-key',
    };
    const optionalResponse = {
        authenticatorData: 'authenticatorDataQuartz',
        publicKey: 'MFkwEwYHKoZIzj0CAQ',
        publicKeyAlgorithm: -7,
        transports: ['internal', 'hybrid'],
    };

    it('parses a registration response without the optional fields', () => {
        const result = MfaPasskeyRegistrationResponseSchema.parse(base);

        expect(result).toEqual(base);
    });

    it('parses a registration response with the optional response fields and the attachment', () => {
        const full = {
            ...base,
            authenticatorAttachment: 'platform',
            response: { ...base.response, ...optionalResponse },
        };

        const result = MfaPasskeyRegistrationResponseSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects an undeclared top-level key', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            extra: 'value',
        });

        expect(result.success).toBe(false);
    });

    it('rejects an undeclared response key', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, signature: 'AbC' },
        });

        expect(result.success).toBe(false);
    });

    it('accepts an id of 1364 characters and rejects one of 1365', () => {
        const accepted = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            id: 'a'.repeat(1364),
        });
        const rejected = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            id: 'a'.repeat(1365),
        });

        expect(accepted.success).toBe(true);
        expect(rejected.success).toBe(false);
    });

    it('rejects an id holding a character outside base64url', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            id: 'ab+c',
        });

        expect(result.success).toBe(false);
    });

    it('rejects an assertion-shaped response with no attestationObject', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            response: {
                clientDataJSON: 'AbC',
                authenticatorData: 'AbC',
                signature: 'AbC',
            },
        });

        expect(result.success).toBe(false);
    });

    it('rejects a transport outside the known members', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, transports: ['carrier-pigeon'] },
        });

        expect(result.success).toBe(false);
    });

    it('rejects a type other than public-key', () => {
        const result = MfaPasskeyRegistrationResponseSchema.safeParse({
            ...base,
            type: 'password',
        });

        expect(result.success).toBe(false);
    });

    it('strips an unknown key inside clientExtensionResults', () => {
        const result = MfaPasskeyRegistrationResponseSchema.parse({
            ...base,
            clientExtensionResults: { credProps: { rk: true }, unknown: 1 },
        });

        expect(result.clientExtensionResults).toEqual({});
    });
});
