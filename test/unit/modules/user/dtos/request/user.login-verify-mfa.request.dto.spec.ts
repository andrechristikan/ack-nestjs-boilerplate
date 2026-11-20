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
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            code: 'abc123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['code'], code: 'invalid_format' }),
        ]);
    });

    it('rejects a backupCode with a lowercase character', () => {
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            backupCode: 'abcd1234ef',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['backupCode'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects a method outside EnumMfaMethod', () => {
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            method: 'unknownMethod',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['method'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            rememberMe: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a challengeToken of 128 characters and rejects one of 129', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(128),
            })
        ).not.toThrow();
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
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

    it('accepts a code of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                code: '1'.repeat(32),
            })
        ).not.toThrow();
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            code: '1'.repeat(33),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['code'], code: 'too_big' }),
        ]);
    });

    it('accepts a backupCode of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserLoginVerifyMfaRequestSchema.parse({
                ...payload,
                backupCode: 'A'.repeat(32),
            })
        ).not.toThrow();
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
            ...payload,
            backupCode: 'A'.repeat(33),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['backupCode'], code: 'too_big' }),
        ]);
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
        const result = UserLoginVerifyMfaRequestSchema.safeParse({
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
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyResponse'],
                code: 'unrecognized_keys',
            }),
        ]);
    });
});
