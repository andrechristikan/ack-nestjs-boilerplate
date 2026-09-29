import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthJwtAccessStrategy', () => {
    const authDomain = mock<AuthDomain>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let strategy: AuthJwtAccessStrategy;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.jwt.prefix': 'Bearer',
                'auth.jwt.audience': 'aud',
                'auth.jwt.issuer': 'iss',
                'auth.jwt.accessToken.jwksUri':
                    'https://example.com/.well-known/jwks.json',
                'auth.jwt.accessToken.algorithm': 'ES256',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtAccessStrategy,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        strategy = module.get(AuthJwtAccessStrategy);
    });

    describe('validate', () => {
        it('delegates session and payload checks to AuthDomain', async () => {
            const payload: IAuthJwtAccessTokenPayload = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'jane@example.com',
                username: 'jane',
                userId: 'user-1',
                sessionId: 'session-1',
                deviceOwnershipId: 'device-1',
                roleId: 'role-1',
            };
            authDomain.validateJwtAccessStrategy.mockResolvedValue(payload);

            const result = await strategy.validate(payload);

            expect(result).toBe(payload);
            expect(authDomain.validateJwtAccessStrategy).toHaveBeenCalledWith(
                payload
            );
        });
    });
});
