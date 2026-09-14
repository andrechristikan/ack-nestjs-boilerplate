import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

describe('AuthJwtRefreshStrategy', () => {
    const authService = {
        validateJwtRefreshStrategy:
            vi.fn<AuthDomain['validateJwtRefreshStrategy']>(),
    } satisfies Pick<AuthDomain, 'validateJwtRefreshStrategy'>;
    const configService = new ConfigService({
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ACK',
        'auth.jwt.issuer': 'https://example.com',
        'auth.jwt.refreshToken.jwksUri':
            'https://example.com/.well-known/refreshInTx-jwks.json',
        'auth.jwt.refreshToken.algorithm': 'ES512',
    });
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
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshStrategy,
                { provide: AuthDomain, useValue: authService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        strategy = moduleRef.get(AuthJwtRefreshStrategy);
    });

    it('delegates a signature-verified payload to refreshInTx validation', async () => {
        authService.validateJwtRefreshStrategy.mockResolvedValue(payload);

        await expect(strategy.validate(payload)).resolves.toBe(payload);
        expect(authService.validateJwtRefreshStrategy).toHaveBeenCalledWith(
            payload
        );
    });
});
