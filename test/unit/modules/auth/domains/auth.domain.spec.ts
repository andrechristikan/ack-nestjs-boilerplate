import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TokenPayload } from 'google-auth-library';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthDomain', () => {
    const authSocialDomain: MockProxy<AuthSocialDomain> =
        mock<AuthSocialDomain>();
    const sessionCache: MockProxy<SessionCache> = mock<SessionCache>();
    let domain: AuthDomain;

    const accessPayload: IAuthJwtAccessTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        email: 'jane@example.com',
        username: 'jane',
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
        roleId: 'role-1',
        jti: 'jti-value',
        sub: 'user-1',
    };
    const refreshPayload: IAuthJwtRefreshTokenPayload = {
        loginAt: accessPayload.loginAt,
        loginFrom: accessPayload.loginFrom,
        loginWith: accessPayload.loginWith,
        sessionId: accessPayload.sessionId,
        deviceOwnershipId: accessPayload.deviceOwnershipId,
        userId: accessPayload.userId,
        jti: 'jti-value',
        sub: accessPayload.userId,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthDomain,
                { provide: AuthSocialDomain, useValue: authSocialDomain },
                { provide: SessionCache, useValue: sessionCache },
            ],
        }).compile();
        domain = module.get(AuthDomain);
    });

    describe('validateJwtAccessStrategy', () => {
        it('throws AuthJwtAccessTokenInvalidException when sub is missing', async () => {
            const { sub: _sub, ...invalidPayload } = accessPayload;

            await expect(
                domain.validateJwtAccessStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('throws AuthJwtAccessTokenInvalidException when sub is not a string', async () => {
            const invalidPayload = {
                ...accessPayload,
                sub: 42 as unknown as string,
            };

            await expect(
                domain.validateJwtAccessStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('throws AuthJwtAccessTokenInvalidException when sessionId is missing', async () => {
            const invalidPayload = { ...accessPayload, sessionId: '' };

            await expect(
                domain.validateJwtAccessStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('throws AuthJwtAccessTokenInvalidException when jti is missing', async () => {
            const { jti: _jti, ...invalidPayload } = accessPayload;

            await expect(
                domain.validateJwtAccessStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('throws AuthJwtAccessTokenInvalidException when jti is not a string', async () => {
            const invalidPayload = {
                ...accessPayload,
                jti: 1 as unknown as string,
            };

            await expect(
                domain.validateJwtAccessStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('throws SessionRevokedException when no session is cached', async () => {
            sessionCache.getLogin.mockResolvedValue(null);

            const rejection = domain.validateJwtAccessStrategy(accessPayload);

            await expect(rejection).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
            expect(sessionCache.getLogin).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
        });

        it('throws SessionRevokedException when the cached jti does not match', async () => {
            const cached: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'different-jti',
            };
            sessionCache.getLogin.mockResolvedValue(cached);

            await expect(
                domain.validateJwtAccessStrategy(accessPayload)
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
        });

        it('returns the payload when the session is valid and the jti matches', async () => {
            const cached: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'jti-value',
            };
            sessionCache.getLogin.mockResolvedValue(cached);

            const result =
                await domain.validateJwtAccessStrategy(accessPayload);

            expect(result).toBe(accessPayload);
        });
    });

    describe('validateJwtAccessGuard', () => {
        it('rethrows a typed exception from the strategy unchanged', () => {
            const err = new SessionRevokedException();

            let thrown: unknown;
            try {
                domain.validateJwtAccessGuard(
                    err,
                    accessPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(err);
            expect(thrown).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
        });

        it('throws AuthJwtAccessTokenInvalidException with the passport error when present', () => {
            const err = new Error('passport error');

            let thrown: unknown;
            try {
                domain.validateJwtAccessGuard(
                    err,
                    accessPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
                rawError: err,
            });
        });

        it('throws AuthJwtAccessTokenInvalidException with the passport info when no user and no error', () => {
            const info = new Error('no auth header');

            let thrown: unknown;
            try {
                domain.validateJwtAccessGuard(
                    undefined as unknown as Error,
                    undefined as unknown as IAuthJwtAccessTokenPayload,
                    info
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
                rawError: info,
            });
        });

        it('returns the user when there is no error', () => {
            const result = domain.validateJwtAccessGuard(
                undefined as unknown as Error,
                accessPayload,
                undefined as unknown as Error
            );

            expect(result).toBe(accessPayload);
        });
    });

    describe('validateJwtRefreshStrategy', () => {
        it('throws AuthJwtRefreshTokenInvalidException when sub is missing', async () => {
            const { sub: _sub, ...invalidPayload } = refreshPayload;

            await expect(
                domain.validateJwtRefreshStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when sub is not a string', async () => {
            const invalidPayload = {
                ...refreshPayload,
                sub: 42 as unknown as string,
            };

            await expect(
                domain.validateJwtRefreshStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when sessionId is missing', async () => {
            const invalidPayload = { ...refreshPayload, sessionId: '' };

            await expect(
                domain.validateJwtRefreshStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when jti is missing', async () => {
            const { jti: _jti, ...invalidPayload } = refreshPayload;

            await expect(
                domain.validateJwtRefreshStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException when jti is not a string', async () => {
            const invalidPayload = {
                ...refreshPayload,
                jti: 1 as unknown as string,
            };

            await expect(
                domain.validateJwtRefreshStrategy(invalidPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('throws SessionRevokedException when no session is cached', async () => {
            sessionCache.getLogin.mockResolvedValue(null);

            await expect(
                domain.validateJwtRefreshStrategy(refreshPayload)
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
        });

        it('throws SessionRevokedException when the cached jti does not match', async () => {
            const cached: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'different-jti',
            };
            sessionCache.getLogin.mockResolvedValue(cached);

            await expect(
                domain.validateJwtRefreshStrategy(refreshPayload)
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
        });

        it('returns the payload when the session is valid and the jti matches', async () => {
            const cached: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'jti-value',
            };
            sessionCache.getLogin.mockResolvedValue(cached);

            const result =
                await domain.validateJwtRefreshStrategy(refreshPayload);

            expect(result).toBe(refreshPayload);
        });
    });

    describe('validateJwtRefreshGuard', () => {
        it('rethrows a typed exception from the strategy unchanged', () => {
            const err = new SessionRevokedException();

            let thrown: unknown;
            try {
                domain.validateJwtRefreshGuard(
                    err,
                    refreshPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(err);
            expect(thrown).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException with the passport error when present', () => {
            const err = new Error('passport error');

            let thrown: unknown;
            try {
                domain.validateJwtRefreshGuard(
                    err,
                    refreshPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
                rawError: err,
            });
        });

        it('throws AuthJwtRefreshTokenInvalidException with the passport info when no user and no error', () => {
            const info = new Error('no auth header');

            let thrown: unknown;
            try {
                domain.validateJwtRefreshGuard(
                    undefined as unknown as Error,
                    undefined as unknown as IAuthJwtRefreshTokenPayload,
                    info
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
                rawError: info,
            });
        });

        it('returns the user when there is no error', () => {
            const result = domain.validateJwtRefreshGuard(
                undefined as unknown as Error,
                refreshPayload,
                undefined as unknown as Error
            );

            expect(result).toBe(refreshPayload);
        });
    });

    describe('validateOAuthApple', () => {
        it('returns the mapped social payload', async () => {
            const applePayload = {
                email: 'jane@example.com',
                email_verified: true,
            } as VerifyAppleIdTokenResponse;
            authSocialDomain.verifyApple.mockResolvedValue(applePayload);

            const result = await domain.validateOAuthApple('id-token');

            expect(result).toEqual({
                email: 'jane@example.com',
                emailVerified: true,
            });
            expect(authSocialDomain.verifyApple).toHaveBeenCalledWith(
                'id-token'
            );
        });

        it('rethrows AuthSocialAppleNotConfiguredException unwrapped', async () => {
            const notConfigured = new AuthSocialAppleNotConfiguredException();
            authSocialDomain.verifyApple.mockRejectedValue(notConfigured);

            const rejection = domain.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(notConfigured);
        });

        it('wraps a verification failure in AuthSocialAppleInvalidException', async () => {
            const cause = new Error('apple verification failed');
            authSocialDomain.verifyApple.mockRejectedValue(cause);

            const rejection = domain.validateOAuthApple('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialAppleInvalid
                    ],
                messagePath: 'auth.error.socialAppleInvalid',
                rawError: cause,
            });
        });
    });

    describe('validateOAuthGoogle', () => {
        it('returns the mapped social payload', async () => {
            const googlePayload = {
                email: 'jane@example.com',
                email_verified: true,
            } as TokenPayload;
            authSocialDomain.verifyGoogle.mockResolvedValue(googlePayload);

            const result = await domain.validateOAuthGoogle('id-token');

            expect(result).toEqual({
                email: 'jane@example.com',
                emailVerified: true,
            });
        });

        it('defaults email and emailVerified when the payload omits them', async () => {
            const googlePayload = {} as TokenPayload;
            authSocialDomain.verifyGoogle.mockResolvedValue(googlePayload);

            const result = await domain.validateOAuthGoogle('id-token');

            expect(result).toEqual({ email: '', emailVerified: false });
        });

        it('rethrows AuthSocialGoogleNotConfiguredException unwrapped', async () => {
            const notConfigured = new AuthSocialGoogleNotConfiguredException();
            authSocialDomain.verifyGoogle.mockRejectedValue(notConfigured);

            const rejection = domain.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(notConfigured);
        });

        it('wraps a verification failure in AuthSocialGoogleInvalidException', async () => {
            const cause = new Error('google verification failed');
            authSocialDomain.verifyGoogle.mockRejectedValue(cause);

            const rejection = domain.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleInvalid
                    ],
                messagePath: 'auth.error.socialGoogleInvalid',
                rawError: cause,
            });
        });
    });
});
