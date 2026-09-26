import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';

const googleMocks = vi.hoisted(() => ({
    OAuth2Client: vi.fn(function () {
        return { verifyIdToken: googleMocks.verifyIdToken };
    }),
    verifyIdToken: vi.fn(),
}));
const appleMocks = vi.hoisted(() => ({ verify: vi.fn() }));

vi.mock('google-auth-library', () => ({
    OAuth2Client: googleMocks.OAuth2Client,
}));

vi.mock('verify-apple-id-token', () => ({
    default: { default: appleMocks.verify },
}));

describe('AuthSocialDomain', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, string> = {
        'auth.apple.clientId': 'apple-client',
        'auth.apple.signInClientId': 'apple-sign-in-client',
        'auth.google.clientId': 'google-client',
        'auth.google.clientSecret': 'google-secret',
    };

    let service: AuthSocialDomain;

    beforeEach(async () => {
        configGet.mockImplementation((key: string) => config[key]);
        vi.resetModules();
        const { AuthSocialDomain: AuthSocialDomainClass } =
            await import('@modules/auth/domains/auth.social.domain');
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialDomainClass,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(AuthSocialDomainClass);
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
        appleMocks.verify.mockResolvedValue(payload);

        await expect(service.verifyApple('apple-token')).resolves.toBe(payload);
        expect(appleMocks.verify).toHaveBeenCalledWith({
            idToken: 'apple-token',
            clientId: ['apple-client', 'apple-sign-in-client'],
        });
    });
});
