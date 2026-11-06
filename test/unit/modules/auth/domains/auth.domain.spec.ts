import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TokenPayload } from 'google-auth-library';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import { RedisErrorMessages } from '@keyv/redis';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';
import { HttpStatus } from '@nestjs/common';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('AuthDomain', () => {
    const authSocialDomain: MockProxy<AuthSocialDomain> =
        mock<AuthSocialDomain>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
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
                { provide: AuthUtil, useValue: authUtil },
            ],
        }).compile();
        domain = module.get(AuthDomain);
    });

    describe('validateJwtAccessStrategy', () => {
        it('throws AuthJwtAccessTokenInvalidException when the payload fails the shape check', () => {
            authUtil.isTokenPayloadValid.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validateJwtAccessStrategy(accessPayload);
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
            });
            expect(authUtil.isTokenPayloadValid).toHaveBeenCalledWith(
                accessPayload
            );
        });

        it('returns the payload when the shape check passes', () => {
            authUtil.isTokenPayloadValid.mockReturnValue(true);

            const result = domain.validateJwtAccessStrategy(accessPayload);

            expect(result).toBe(accessPayload);
        });
    });

    describe('validateJwtAccessSession', () => {
        const identified = {
            ...accessPayload,
            sub: 'user-1',
            jti: 'jti-value',
        };

        it('throws SessionRevokedException when no session jti is stored', () => {
            let thrown: unknown;
            try {
                domain.validateJwtAccessSession(identified, null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
            expect(authUtil.isJtiMatch).not.toHaveBeenCalled();
        });

        it('throws SessionRevokedException when the cached jti does not match', () => {
            authUtil.isJtiMatch.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validateJwtAccessSession(identified, 'different-jti');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                messagePath: 'session.error.revoked',
            });
            expect(authUtil.isJtiMatch).toHaveBeenCalledWith(
                'different-jti',
                'jti-value'
            );
        });

        it('returns the payload when the stored jti matches', () => {
            authUtil.isJtiMatch.mockReturnValue(true);

            const result = domain.validateJwtAccessSession(
                identified,
                'jti-value'
            );

            expect(result).toBe(identified);
        });
    });

    describe('validateJwtAccessGuard', () => {
        it('throws the exception AuthUtil maps from a strategy error', () => {
            const err = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );
            const info = new Error('info');
            const mapped = new AppUnknownException(err);
            authUtil.toJwtGuardException.mockReturnValue(mapped);

            let thrown: unknown;
            try {
                domain.validateJwtAccessGuard(err, accessPayload, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(mapped);
            expect(authUtil.toJwtGuardException).toHaveBeenCalledWith(
                err,
                info,
                expect.any(AuthJwtAccessTokenInvalidException)
            );
        });

        it('throws the AuthJwtAccessTokenInvalidException fallback carrying the passport info when no user and no error', () => {
            const info = new Error('no auth header');
            authUtil.toJwtGuardException.mockImplementation(
                (_err, _info, fallback) => fallback
            );

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

            expect(thrown).toBeInstanceOf(AuthJwtAccessTokenInvalidException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                messagePath: 'auth.error.accessTokenUnauthorized',
                httpStatus: HttpStatus.UNAUTHORIZED,
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
            expect(authUtil.toJwtGuardException).not.toHaveBeenCalled();
        });
    });

    describe('validateJwtRefreshStrategy', () => {
        it('throws AuthJwtRefreshTokenInvalidException when the payload fails the shape check', async () => {
            authUtil.isTokenPayloadValid.mockReturnValue(false);

            await expect(
                domain.validateJwtRefreshStrategy(refreshPayload)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
            expect(authUtil.isTokenPayloadValid).toHaveBeenCalledWith(
                refreshPayload
            );
        });

        it('returns the payload when the shape check passes', async () => {
            authUtil.isTokenPayloadValid.mockReturnValue(true);

            const result =
                await domain.validateJwtRefreshStrategy(refreshPayload);

            expect(result).toBe(refreshPayload);
        });
    });

    describe('validateJwtRefreshGuard', () => {
        it('throws the exception AuthUtil maps from a strategy error', () => {
            const err = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );
            const info = new Error('info');
            const mapped = new AppUnknownException(err);
            authUtil.toJwtGuardException.mockReturnValue(mapped);

            let thrown: unknown;
            try {
                domain.validateJwtRefreshGuard(err, refreshPayload, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(mapped);
            expect(authUtil.toJwtGuardException).toHaveBeenCalledWith(
                err,
                info,
                expect.any(AuthJwtRefreshTokenInvalidException)
            );
        });

        it('throws the AuthJwtRefreshTokenInvalidException fallback carrying the passport info when no user and no error', () => {
            const info = new Error('no auth header');
            authUtil.toJwtGuardException.mockImplementation(
                (_err, _info, fallback) => fallback
            );

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

            expect(thrown).toBeInstanceOf(AuthJwtRefreshTokenInvalidException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                messagePath: 'auth.error.refreshTokenUnauthorized',
                httpStatus: HttpStatus.UNAUTHORIZED,
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
            expect(authUtil.toJwtGuardException).not.toHaveBeenCalled();
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

        it('rethrows AuthSocialAppleInvalidException unwrapped', async () => {
            const invalid = new AuthSocialAppleInvalidException(
                'Apple token payload does not contain email'
            );
            authSocialDomain.verifyApple.mockRejectedValue(invalid);

            const rejection = domain.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(invalid);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws AuthProviderUnavailableException when the Apple endpoint is unreachable', async () => {
            const cause = new Error('network down');
            const unavailable = new AuthProviderUnavailableException(cause);
            authSocialDomain.verifyApple.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            const rejection = domain.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(cause);
        });

        it('wraps a verification failure in AuthSocialAppleInvalidException', async () => {
            const cause = new Error('apple verification failed');
            authSocialDomain.verifyApple.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(null);

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

        it('rethrows AuthSocialGoogleInvalidException unwrapped', async () => {
            const invalid = new AuthSocialGoogleInvalidException(
                'Google token payload does not contain email'
            );
            authSocialDomain.verifyGoogle.mockRejectedValue(invalid);

            const rejection = domain.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(invalid);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws AuthProviderUnavailableException when the Google endpoint is unreachable', async () => {
            const cause = new Error('network down');
            const unavailable = new AuthProviderUnavailableException(cause);
            authSocialDomain.verifyGoogle.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            const rejection = domain.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(cause);
        });

        it('wraps a verification failure in AuthSocialGoogleInvalidException', async () => {
            const cause = new Error('google verification failed');
            authSocialDomain.verifyGoogle.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(null);

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
