import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';

describe('UserForgotPasswordResetRequestSchema', () => {
    const payload = {
        newPassword: 'abcDE12345@@!',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
        token: 'a1b2c3d4e5f6g7h8i9j0',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserForgotPasswordResetRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload with no method, code, or backupCode', () => {
        const minimal = {
            newPassword: payload.newPassword,
            token: payload.token,
        };

        const result = UserForgotPasswordResetRequestSchema.parse(minimal);

        expect(result).toEqual(minimal);
    });

    it('rejects a payload with no token', () => {
        const { token: _token, ...rest } = payload;

        const result = UserForgotPasswordResetRequestSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'invalid_type' }),
        ]);
    });

    it('accepts an all-lowercase 8-character newPassword', () => {
        const result = UserForgotPasswordResetRequestSchema.parse({
            ...payload,
            newPassword: 'abcdefgh',
        });

        expect(result.newPassword).toBe('abcdefgh');
    });

    it('accepts a 64-character newPassword', () => {
        const newPassword = 'a'.repeat(64);

        const result = UserForgotPasswordResetRequestSchema.parse({
            ...payload,
            newPassword,
        });

        expect(result.newPassword).toBe(newPassword);
    });

    it('rejects a 7-character newPassword', () => {
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            newPassword: 'abcdefg',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['newPassword'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects a 65-character newPassword', () => {
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            newPassword: 'a'.repeat(65),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['newPassword'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            oldPassword: 'oldPassword1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a token of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                token: 'a'.repeat(200),
            })
        ).not.toThrow();
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            token: 'a'.repeat(201),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'too_big' }),
        ]);
    });

    it('parses a passkey payload with its challenge token and assertion', () => {
        const passkeyPayload = {
            newPassword: payload.newPassword,
            token: payload.token,
            method: EnumMfaMethod.passkey,
            passkeyChallengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            passkeyResponse: {
                id: 'credential-one',
                rawId: 'credential-one',
                response: {
                    clientDataJSON: 'client-data',
                    authenticatorData: 'authenticator-data',
                    signature: 'signature',
                },
                clientExtensionResults: {},
                type: 'public-key' as const,
            },
        };

        const result =
            UserForgotPasswordResetRequestSchema.parse(passkeyPayload);

        expect(result).toEqual(passkeyPayload);
    });

    it('accepts a passkeyChallengeToken of 128 characters and rejects an empty one and one of 129', () => {
        expect(() =>
            UserForgotPasswordResetRequestSchema.parse({
                ...payload,
                passkeyChallengeToken: 'a'.repeat(128),
            })
        ).not.toThrow();
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            passkeyChallengeToken: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyChallengeToken'],
                code: 'too_small',
            }),
        ]);

        const result2 = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            passkeyChallengeToken: 'a'.repeat(129),
        });

        expect(result2.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyChallengeToken'],
                code: 'too_big',
            }),
        ]);
    });

    it('rejects a passkeyResponse that is not an assertion', () => {
        const result = UserForgotPasswordResetRequestSchema.safeParse({
            ...payload,
            passkeyResponse: { id: 'credential-one' },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyResponse', 'rawId'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['passkeyResponse', 'response'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['passkeyResponse', 'type'],
                code: 'invalid_value',
            }),
            expect.objectContaining({
                path: ['passkeyResponse', 'clientExtensionResults'],
                code: 'invalid_type',
            }),
        ]);
    });
});
