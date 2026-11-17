import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

describe('UserReauthenticationRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumMfaMethod.totp,
        code: '654321',
        backupCode: 'ABCD1234EF',
        passkeyChallengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
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
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result = UserReauthenticationRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = UserReauthenticationRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });

    it('accepts a password of 64 characters and rejects one of 65', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                password: 'a'.repeat(64),
            })
        ).not.toThrow();
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                password: 'a'.repeat(65),
            })
        ).toThrow();
    });

    it('accepts a otp of 32 characters and rejects one of 33', () => {
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                otp: '1'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            UserReauthenticationRequestSchema.parse({
                ...payload,
                otp: '1'.repeat(33),
            })
        ).toThrow();
    });

    it('accepts a passkeyChallengeToken of 128 characters and rejects an empty one and one of 129', () => {
        expect(
            UserReauthenticationRequestSchema.safeParse({
                ...payload,
                passkeyChallengeToken: 'a'.repeat(128),
            }).success
        ).toBe(true);
        expect(
            UserReauthenticationRequestSchema.safeParse({
                ...payload,
                passkeyChallengeToken: '',
            }).success
        ).toBe(false);
        expect(
            UserReauthenticationRequestSchema.safeParse({
                ...payload,
                passkeyChallengeToken: 'a'.repeat(129),
            }).success
        ).toBe(false);
    });

    it('rejects a passkeyResponse that is not an assertion', () => {
        const result = UserReauthenticationRequestSchema.safeParse({
            ...payload,
            passkeyResponse: {
                ...payload.passkeyResponse,
                response: { clientDataJSON: 'AbC', attestationObject: 'AbC' },
            },
        });

        expect(result.success).toBe(false);
    });

    it('accepts the totp and backupCode methods and rejects the passkey method', () => {
        expect(
            UserReauthenticationRequestSchema.safeParse({
                method: EnumMfaMethod.totp,
            }).success
        ).toBe(true);
        expect(
            UserReauthenticationRequestSchema.safeParse({
                method: EnumMfaMethod.backupCode,
            }).success
        ).toBe(true);
        expect(
            UserReauthenticationRequestSchema.safeParse({
                method: EnumMfaMethod.passkey,
            }).success
        ).toBe(false);
    });
});
