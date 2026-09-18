import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import verifyAppleToken from 'verify-apple-id-token';

import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';

const googleMocks = vi.hoisted(() => ({
    verifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
    OAuth2Client: class {
        verifyIdToken = googleMocks.verifyIdToken;
    },
}));

vi.mock('verify-apple-id-token', () => ({
    default: vi.fn(),
}));

describe('AuthSocialDomain', () => {
    let service: AuthSocialDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new AuthSocialDomain(
            new ConfigService({
                'auth.apple.clientId': 'apple-client',
                'auth.apple.signInClientId': 'apple-sign-in-client',
                'auth.google.clientId': 'google-client',
                'auth.google.clientSecret': 'google-secret',
            })
        );
    });

    it('returns a Google payload with a verified email', async () => {
        const payload = {
            iss: 'accounts.google.com',
            aud: 'google-client',
            exp: 1,
            iat: 1,
            sub: 'google-user',
            email: 'user@example.com',
            email_verified: true,
        };
        googleMocks.verifyIdToken.mockResolvedValue({
            getPayload: () => payload,
        });

        await expect(service.verifyGoogle('google-token')).resolves.toBe(
            payload
        );
        expect(googleMocks.verifyIdToken).toHaveBeenCalledWith({
            idToken: 'google-token',
        });
    });

    it.each([
        ['missing payload', undefined],
        ['missing email', { email_verified: true }],
        [
            'unverified email',
            { email: 'user@example.com', email_verified: false },
        ],
    ])('rejects a Google token with %s', async (_case, payload) => {
        googleMocks.verifyIdToken.mockResolvedValue({
            getPayload: () => payload,
        });

        await expect(service.verifyGoogle('google-token')).rejects.toThrow();
    });

    it('verifies Apple tokens against both configured client identifiers', async () => {
        const payload = {
            iss: 'https://appleid.apple.com',
            aud: 'apple-client',
            exp: 1,
            iat: 1,
            sub: 'apple-user',
            c_hash: 'code-hash',
            email: 'user@example.com',
            email_verified: true,
            is_private_email: false,
            auth_time: 1,
            nonce_supported: true,
        };
        vi.mocked(verifyAppleToken).mockResolvedValue(payload);

        await expect(service.verifyApple('apple-token')).resolves.toBe(payload);
        expect(verifyAppleToken).toHaveBeenCalledWith({
            idToken: 'apple-token',
            clientId: ['apple-client', 'apple-sign-in-client'],
        });
    });
});
