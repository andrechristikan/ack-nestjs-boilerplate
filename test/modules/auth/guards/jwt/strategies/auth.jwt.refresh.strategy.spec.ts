import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthJwtRefreshStrategy', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, string> = {
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ACK',
        'auth.jwt.issuer': 'https://example.com',
        'auth.jwt.refreshToken.jwksUri':
            'https://example.com/.well-known/refreshInTx-jwks.json',
        'auth.jwt.refreshToken.algorithm': 'ES512',
    };
    const payload = {
        userId: 'user-id',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    } satisfies IAuthJwtRefreshTokenPayload;

    let strategy: AuthJwtRefreshStrategy;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => config[key]);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshStrategy,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        strategy = moduleRef.get(AuthJwtRefreshStrategy);
    });

    it('delegates a signature-verified payload to refreshInTx validation', async () => {
        authDomain.validateJwtRefreshStrategy.mockResolvedValue(payload);

        await expect(strategy.validate(payload)).resolves.toBe(payload);
        expect(authDomain.validateJwtRefreshStrategy).toHaveBeenCalledWith(
            payload
        );
    });
});
