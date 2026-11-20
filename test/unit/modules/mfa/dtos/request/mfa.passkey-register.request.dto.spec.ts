import { MfaPasskeyRegisterRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';

describe('MfaPasskeyRegisterRequestSchema', () => {
    const registrationResponse = {
        id: 'AbC_-123',
        rawId: 'AbC_-123',
        response: {
            clientDataJSON: 'clientDataQuartz',
            attestationObject: 'attestationQuartz',
        },
        clientExtensionResults: {},
        type: 'public-key',
    };
    const payload = {
        challengeToken: 'token-quartz',
        name: 'iPhone',
        registrationResponse,
        passkeyChallengeToken: 'reauthentication-token-quartz',
        passkeyResponse: {
            id: 'AbC_-123',
            rawId: 'AbC_-123',
            response: {
                clientDataJSON: 'clientDataQuartz',
                authenticatorData: 'authenticatorDataQuartz',
                signature: 'signatureQuartz',
            },
            clientExtensionResults: {},
            type: 'public-key',
        },
        password: 'Current-pass1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = MfaPasskeyRegisterRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an attestation-shaped passkeyResponse', () => {
        const result = MfaPasskeyRegisterRequestSchema.safeParse({
            ...payload,
            passkeyResponse: registrationResponse,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyResponse', 'response', 'authenticatorData'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['passkeyResponse', 'response', 'signature'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['passkeyResponse', 'response'],
                code: 'unrecognized_keys',
            }),
        ]);
    });

    it.each([['challengeToken'], ['name'], ['registrationResponse']])(
        'rejects a payload without %s',
        key => {
            const { [key]: _omitted, ...rest } = payload as Record<
                string,
                unknown
            >;

            const result = MfaPasskeyRegisterRequestSchema.safeParse(rest);

            expect(result.error?.issues).toEqual([
                expect.objectContaining({ path: [key], code: 'invalid_type' }),
            ]);
        }
    );

    it('rejects an assertion-shaped registrationResponse with no attestationObject', () => {
        const result = MfaPasskeyRegisterRequestSchema.safeParse({
            ...payload,
            registrationResponse: {
                ...registrationResponse,
                response: {
                    clientDataJSON: 'AbC',
                    authenticatorData: 'AbC',
                    signature: 'AbC',
                },
            },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['registrationResponse', 'response', 'attestationObject'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['registrationResponse', 'response'],
                code: 'unrecognized_keys',
            }),
        ]);
    });

    it('accepts a name of 50 characters and rejects an empty one and one of 51', () => {
        expect(
            MfaPasskeyRegisterRequestSchema.safeParse({
                ...payload,
                name: 'a'.repeat(50),
            }).success
        ).toBe(true);
        expect(
            MfaPasskeyRegisterRequestSchema.safeParse({ ...payload, name: '' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
        expect(
            MfaPasskeyRegisterRequestSchema.safeParse({
                ...payload,
                name: 'a'.repeat(51),
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a challengeToken of 129 characters', () => {
        const result = MfaPasskeyRegisterRequestSchema.safeParse({
            ...payload,
            challengeToken: 'a'.repeat(129),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['challengeToken'],
                code: 'too_big',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = MfaPasskeyRegisterRequestSchema.safeParse({
            ...payload,
            username: 'johnSmith123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
