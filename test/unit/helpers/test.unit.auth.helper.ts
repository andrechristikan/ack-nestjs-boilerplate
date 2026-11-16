import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HelperDateService } from '@common/helper/services/helper.date.service';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import type { AuthSocialNonceRepository } from '@modules/auth/repositories/auth.social-nonce.repository';
import type { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export const AuthSocialConfigDefaults: Record<string, string | number | null> =
    {
        'auth.apple.clientId': 'apple-client-id',
        'auth.apple.signInClientId': 'apple-sign-in-client-id',
        'auth.google.clientId': 'google-client-id',
        'auth.social.nonce.length': 32,
        'auth.social.nonce.expiredInMs': 300000,
    };

export interface IAuthSocialServiceDoubles {
    authSocialNonceRepository: MockProxy<AuthSocialNonceRepository>;
    helperStringService: MockProxy<HelperStringService>;
    helperHashService: MockProxy<HelperHashService>;
    helperDateService: MockProxy<HelperDateService>;
}

export function buildAuthSocialServiceDoubles(): IAuthSocialServiceDoubles {
    return {
        authSocialNonceRepository: mock<AuthSocialNonceRepository>(),
        helperStringService: mock<HelperStringService>(),
        helperHashService: mock<HelperHashService>(),
        helperDateService: mock<HelperDateService>(),
    };
}

export async function createAuthSocialService(
    overrides: Record<string, string | number | null>,
    doubles: IAuthSocialServiceDoubles = buildAuthSocialServiceDoubles()
): Promise<AuthSocialService> {
    const { AuthSocialService: AuthSocialServiceClass } =
        await import('@modules/auth/services/auth.social.service');
    const [
        { AuthSocialNonceRepository: NonceRepositoryClass },
        { HelperStringService: HelperStringServiceClass },
        { HelperHashService: HelperHashServiceClass },
        { HelperDateService: HelperDateServiceClass },
    ] = await Promise.all([
        import('@modules/auth/repositories/auth.social-nonce.repository'),
        import('@common/helper/services/helper.string.service'),
        import('@common/helper/services/helper.hash.service'),
        import('@common/helper/services/helper.date.service'),
    ]);
    const configService = buildConfigService({
        ...AuthSocialConfigDefaults,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AuthSocialServiceClass,
            { provide: ConfigService, useValue: configService },
            {
                provide: NonceRepositoryClass,
                useValue: doubles.authSocialNonceRepository,
            },
            {
                provide: HelperStringServiceClass,
                useValue: doubles.helperStringService,
            },
            {
                provide: HelperHashServiceClass,
                useValue: doubles.helperHashService,
            },
            {
                provide: HelperDateServiceClass,
                useValue: doubles.helperDateService,
            },
        ],
    }).compile();

    return module.get(AuthSocialServiceClass);
}
