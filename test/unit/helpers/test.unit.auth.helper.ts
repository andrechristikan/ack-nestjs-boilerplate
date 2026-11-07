import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export const AuthSocialConfigDefaults: Record<string, string | null> = {
    'auth.apple.clientId': 'apple-client-id',
    'auth.apple.signInClientId': 'apple-sign-in-client-id',
    'auth.google.clientId': 'google-client-id',
};

export async function createAuthSocialService(
    overrides: Record<string, string | null>
): Promise<AuthSocialService> {
    const { AuthSocialService: AuthSocialServiceClass } =
        await import('@modules/auth/services/auth.social.service');
    const configService = buildConfigService({
        ...AuthSocialConfigDefaults,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AuthSocialServiceClass,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(AuthSocialServiceClass);
}
