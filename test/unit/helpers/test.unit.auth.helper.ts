import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export const AuthSocialConfigDefaults: Record<string, string | null> = {
    'auth.apple.clientId': 'apple-client-id',
    'auth.apple.signInClientId': 'apple-sign-in-client-id',
    'auth.google.clientId': 'google-client-id',
};

export async function createAuthSocialDomain(
    overrides: Record<string, string | null>
): Promise<AuthSocialDomain> {
    const { AuthSocialDomain: AuthSocialDomainClass } =
        await import('@modules/auth/domains/auth.social.domain');
    const configService = buildConfigService({
        ...AuthSocialConfigDefaults,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AuthSocialDomainClass,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(AuthSocialDomainClass);
}
