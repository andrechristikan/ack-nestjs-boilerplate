import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
} from '@generated/prisma-client/client';
import { UserLoginPasskeyRequestSchema } from '@modules/user/dtos/request/user.login-passkey.request.dto';

describe('UserLoginPasskeyRequestSchema', () => {
    const payload = {
        challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
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
        from: EnumUserLoginFrom.website,
        device: {
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            platform: EnumDevicePlatform.web,
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserLoginPasskeyRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a payload with no passkeyResponse', () => {
        const { passkeyResponse: _passkeyResponse, ...rest } = payload;

        expect(() => UserLoginPasskeyRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a payload with no challengeToken', () => {
        const { challengeToken: _challengeToken, ...rest } = payload;

        expect(() => UserLoginPasskeyRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a payload with no from', () => {
        const { from: _from, ...rest } = payload;

        expect(() => UserLoginPasskeyRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a payload with no device', () => {
        const { device: _device, ...rest } = payload;

        expect(() => UserLoginPasskeyRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a passkeyResponse that is not an assertion', () => {
        expect(() =>
            UserLoginPasskeyRequestSchema.parse({
                ...payload,
                passkeyResponse: { ...payload.passkeyResponse, type: 'other' },
            })
        ).toThrow();
    });

    it('accepts a challengeToken of 128 characters and rejects one of 129', () => {
        expect(() =>
            UserLoginPasskeyRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(128),
            })
        ).not.toThrow();
        expect(() =>
            UserLoginPasskeyRequestSchema.parse({
                ...payload,
                challengeToken: 'a'.repeat(129),
            })
        ).toThrow();
    });

    it('rejects an empty challengeToken', () => {
        expect(() =>
            UserLoginPasskeyRequestSchema.parse({
                ...payload,
                challengeToken: '',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserLoginPasskeyRequestSchema.parse({
                ...payload,
                email: 'user@example.com',
            })
        ).toThrow();
    });
});
