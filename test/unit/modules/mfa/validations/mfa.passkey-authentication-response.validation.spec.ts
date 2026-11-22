import { MfaPasskeyAuthenticationResponseSchema } from '@modules/mfa/validations/mfa.passkey-authentication-response.validation';

describe('MfaPasskeyAuthenticationResponseSchema', () => {
    const base = {
        id: 'AbC_-123',
        rawId: 'AbC_-123',
        response: {
            clientDataJSON: 'clientDataQuartz',
            authenticatorData: 'authenticatorDataQuartz',
            signature: 'signatureQuartz',
        },
        clientExtensionResults: {},
        type: 'public-key',
    };

    it('parses an assertion without userHandle and the attachment', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.parse(base);

        expect(result).toEqual(base);
    });

    it('parses an assertion with userHandle and the attachment', () => {
        const full = {
            ...base,
            authenticatorAttachment: 'platform',
            response: { ...base.response, userHandle: 'userHandleQuartz' },
        };

        const result = MfaPasskeyAuthenticationResponseSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects an undeclared top-level key', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            extra: 'value',
        });

        expect(result.success).toBe(false);
    });

    it('rejects an undeclared response key', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, attestationObject: 'AbC' },
        });

        expect(result.success).toBe(false);
    });

    it('accepts an id of 1364 characters and rejects one of 1365', () => {
        const accepted = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            id: 'a'.repeat(1364),
        });
        const rejected = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            id: 'a'.repeat(1365),
        });

        expect(accepted.success).toBe(true);
        expect(rejected.success).toBe(false);
    });

    it('accepts a signature of 1024 characters and rejects one of 1025', () => {
        const accepted = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, signature: 'a'.repeat(1024) },
        });
        const rejected = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, signature: 'a'.repeat(1025) },
        });

        expect(accepted.success).toBe(true);
        expect(rejected.success).toBe(false);
    });

    it('accepts a userHandle of 86 characters and rejects one of 87', () => {
        const accepted = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, userHandle: 'a'.repeat(86) },
        });
        const rejected = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, userHandle: 'a'.repeat(87) },
        });

        expect(accepted.success).toBe(true);
        expect(rejected.success).toBe(false);
    });

    it('rejects a signature holding a character outside base64url', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            response: { ...base.response, signature: 'ab+c' },
        });

        expect(result.success).toBe(false);
    });

    it('rejects a type other than public-key', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.safeParse({
            ...base,
            type: 'password',
        });

        expect(result.success).toBe(false);
    });

    it('strips an unknown key inside clientExtensionResults', () => {
        const result = MfaPasskeyAuthenticationResponseSchema.parse({
            ...base,
            clientExtensionResults: { appid: true, unknown: 1 },
        });

        expect(result.clientExtensionResults).toEqual({});
    });
});
