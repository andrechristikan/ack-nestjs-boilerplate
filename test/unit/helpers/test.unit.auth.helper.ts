import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialNonceRepository } from '@modules/auth/repositories/auth.social-nonce.repository';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

export const AuthSocialConfigDefaults: Record<
    string,
    string | number | string[] | null
> = {
    'auth.social.google.clientId': 'google-client-id',
    'auth.social.apple.clientIds': [
        'apple-client-id',
        'apple-sign-in-client-id',
    ],
    'auth.social.nonce.length': 32,
    'auth.social.nonce.expiresInMs': 300000,
};

export interface IAuthSocialServiceDoubles {
    authSocialNonceRepository: MockProxy<AuthSocialNonceRepository>;
}

export function buildAuthSocialServiceDoubles(): IAuthSocialServiceDoubles {
    return {
        authSocialNonceRepository: mock<AuthSocialNonceRepository>(),
    };
}

export async function createAuthSocialService(
    overrides: Record<string, string | number | string[] | null>,
    doubles: IAuthSocialServiceDoubles = buildAuthSocialServiceDoubles()
): Promise<AuthSocialService> {
    const configService = buildConfigService({
        ...TestUnitKitConfigValues,
        ...AuthSocialConfigDefaults,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            AuthSocialService,
            { provide: ConfigService, useValue: configService },
            {
                provide: AuthSocialNonceRepository,
                useValue: doubles.authSocialNonceRepository,
            },
        ],
    }).compile();

    return module.get(AuthSocialService);
}
