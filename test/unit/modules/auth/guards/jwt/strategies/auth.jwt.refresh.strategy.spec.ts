import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthJwtRefreshStrategy', () => {
    const authDomain: MockProxy<AuthDomain> = mock<AuthDomain>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let strategy: AuthJwtRefreshStrategy;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.jwt.audience': 'aud',
                'auth.jwt.issuer': 'iss',
                'auth.jwt.refreshToken.jwksUri':
                    'https://example.com/.well-known/jwks.json',
                'auth.jwt.refreshToken.algorithm': 'ES512',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshStrategy,
                { provide: AuthDomain, useValue: authDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        strategy = module.get(AuthJwtRefreshStrategy);
    });

    describe('jwtFromRequest', () => {
        it('extracts the token from an Authorization Bearer header', () => {
            const request = {
                headers: { authorization: 'Bearer jwt-token' },
            } as unknown as IRequestApp;

            const extract = Reflect.get(strategy, '_jwtFromRequest') as (
                req: IRequestApp
            ) => string | null;

            const token = extract(request);

            expect(token).toBe('jwt-token');
        });

        it('returns null when the Authorization header uses another scheme', () => {
            const request = {
                headers: { authorization: 'Basic jwt-token' },
            } as unknown as IRequestApp;

            const extract = Reflect.get(strategy, '_jwtFromRequest') as (
                req: IRequestApp
            ) => string | null;

            const token = extract(request);

            expect(token).toBeNull();
        });
    });

    describe('validate', () => {
        it('delegates session and payload checks to AuthDomain', async () => {
            const payload: IAuthJwtRefreshTokenPayload = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: 'user-1',
                sessionId: 'session-1',
                deviceOwnershipId: 'device-1',
            };
            authDomain.validateJwtRefreshStrategy.mockResolvedValue(payload);

            const result = await strategy.validate(payload);

            expect(result).toBe(payload);
            expect(authDomain.validateJwtRefreshStrategy).toHaveBeenCalledWith(
                payload
            );
        });
    });
});
