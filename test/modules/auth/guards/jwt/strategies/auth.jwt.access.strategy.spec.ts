import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthJwtAccessStrategy', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, string> = {
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ACK',
        'auth.jwt.issuer': 'https://example.com',
        'auth.jwt.accessToken.jwksUri':
            'https://example.com/.well-known/access-jwks.json',
        'auth.jwt.accessToken.algorithm': 'ES256',
    };
    const payload = {
        userId: 'user-id',
        roleId: 'role-id',
        username: 'user',
        email: 'user@example.com',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    } satisfies IAuthJwtAccessTokenPayload;

    let strategy: AuthJwtAccessStrategy;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => config[key]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtAccessStrategy,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        strategy = moduleRef.get(AuthJwtAccessStrategy);
    });

    it('delegates a signature-verified payload to access validation', async () => {
        authDomain.validateJwtAccessStrategy.mockResolvedValue(payload);

        await expect(strategy.validate(payload)).resolves.toBe(payload);
        expect(authDomain.validateJwtAccessStrategy).toHaveBeenCalledWith(
            payload
        );
    });
});
