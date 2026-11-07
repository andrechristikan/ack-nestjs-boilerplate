import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { VerifyOptions } from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthService } from '@modules/auth/services/auth.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

const { passportJwtSecretMock } = vi.hoisted(() => ({
    passportJwtSecretMock: vi.fn(),
}));

vi.mock('jwks-rsa', () => ({
    passportJwtSecret: passportJwtSecretMock,
}));

describe('AuthJwtAccessStrategy', () => {
    const authService: MockProxy<AuthService> = mock<AuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let strategy: AuthJwtAccessStrategy;

    beforeEach(async () => {
        vi.resetAllMocks();
        passportJwtSecretMock.mockReturnValue(vi.fn());
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.jwks.requestsPerMinute': 60,
                'auth.jwks.cacheMaxAgeInMs': 600000,
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
                { provide: AuthService, useValue: authService },
                { provide: SessionService, useValue: sessionService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        strategy = module.get(AuthJwtAccessStrategy);
    });

    describe('constructor', () => {
        it('builds the JWKS client from the configured request budget and cache age', () => {
            expect(passportJwtSecretMock).toHaveBeenCalledWith({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 60,
                cacheMaxAge: 600000,
                jwksUri: 'https://example.com/.well-known/jwks.json',
            });
        });

        it('verifies the configured audience and issuer', () => {
            const verifyOptions = Reflect.get(
                strategy,
                '_verifOpts'
            ) as VerifyOptions;

            expect(verifyOptions.audience).toBe('aud');
            expect(verifyOptions.issuer).toBe('iss');
        });
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
        const identified = { ...payload, sub: 'user-1', jti: 'jti-value' };
        const login: ISessionCache = {
            userId: 'user-1',
            sessionId: 'session-1',
            jtiDigest: 'jti-digest',
        };

        it('checks the payload, reads the login through SessionService, then checks the session', async () => {
            authService.validateJwtAccessStrategy.mockReturnValue(identified);
            sessionService.getLogin.mockResolvedValue(login);
            authService.validateJwtAccessSession.mockReturnValue(identified);

            const result = await strategy.validate(payload);

            expect(result).toBe(identified);
            expect(authService.validateJwtAccessStrategy).toHaveBeenCalledWith(
                payload
            );
            expect(sessionService.getLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
            expect(authService.validateJwtAccessSession).toHaveBeenCalledWith(
                identified,
                'jti-digest'
            );
            expect(
                authService.validateJwtAccessStrategy
            ).toHaveBeenCalledBefore(sessionService.getLogin);
        });

        it('hands a missing login to the session check', async () => {
            authService.validateJwtAccessStrategy.mockReturnValue(identified);
            sessionService.getLogin.mockResolvedValue(null);
            authService.validateJwtAccessSession.mockReturnValue(identified);

            await strategy.validate(payload);

            expect(authService.validateJwtAccessSession).toHaveBeenCalledWith(
                identified,
                null
            );
        });

        it('does not read the login when the payload check throws', async () => {
            const failure = new Error('invalid payload');
            authService.validateJwtAccessStrategy.mockImplementation(() => {
                throw failure;
            });

            await expect(strategy.validate(payload)).rejects.toBe(failure);
            expect(sessionService.getLogin).not.toHaveBeenCalled();
        });

        it('propagates a login read failure instead of revoking the session', async () => {
            const failure = new Error('redis down');
            authService.validateJwtAccessStrategy.mockReturnValue(identified);
            sessionService.getLogin.mockRejectedValue(failure);

            await expect(strategy.validate(payload)).rejects.toBe(failure);
            expect(authService.validateJwtAccessSession).not.toHaveBeenCalled();
        });
    });
});
