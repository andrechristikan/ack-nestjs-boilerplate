import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserLoginVerifyMfaRequestSchema } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';

describe('UserLoginVerifyMfaRequestSchema', () => {
    const payload = {
        challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserLoginVerifyMfaRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no code and no backupCode', () => {
        const { code: _code, backupCode: _backupCode, ...rest } = payload;

        const result = UserLoginVerifyMfaRequestSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('rejects a code with a non-digit character', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                code: 'abc123',
            })
        ).toThrow();
    });

    it('rejects a backupCode with a lowercase character', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                backupCode: 'abcd1234ef',
            })
        ).toThrow();
    });

    it('rejects a method outside EnumMfaMethod', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                method: 'unknownMethod',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                rememberMe: true,
            })
        ).toThrow();
    });

    it('accepts a challengeToken of 128 characters and rejects one of 129', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(128),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(129),
            })
        ).toThrow();
    });

    it('accepts a code of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                code: '1'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                code: '1'.repeat(33),
            })
        ).toThrow();
    });

    it('accepts a backupCode of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                backupCode: 'A'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                backupCode: 'A'.repeat(33),
            })
        ).toThrow();
    });

    it('parses a passkey payload and strips every key of clientExtensionResults', () => {
        const passkeyPayload = {
            challengeToken: payload.challengeToken,
            method: EnumMfaMethod.passkey,
            passkeyResponse: {
                id: 'AbC_-123',
                rawId: 'AbC_-123',
                response: {
                    clientDataJSON: 'clientDataQuartz',
                    authenticatorData: 'authenticatorDataQuartz',
                    signature: 'signatureQuartz',
                },
                clientExtensionResults: { unknown: 1 },
                type: 'public-key',
            },
        };

        const result = UserLoginVerifyMfaRequestSchema.parse(passkeyPayload);

        expect(result).toEqual({
            ...passkeyPayload,
            passkeyResponse: {
                ...passkeyPayload.passkeyResponse,
                clientExtensionResults: {},
            },
        });
    });

    it('rejects a passkeyResponse with an undeclared key', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                challengeToken: payload.challengeToken,
                method: EnumMfaMethod.passkey,
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
                    extra: 'value',
                },
            })
        ).toThrow();
    });
});
