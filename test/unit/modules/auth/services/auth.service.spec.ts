import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TokenPayload } from 'google-auth-library';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import { RedisErrorMessages } from '@keyv/redis';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
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

describe('AuthService', () => {
    const authSocialService: MockProxy<AuthSocialService> =
        mock<AuthSocialService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    let service: AuthService;

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
                AuthService,
                { provide: AuthSocialService, useValue: authSocialService },
                { provide: AuthUtil, useValue: authUtil },
            ],
        }).compile();
        service = module.get(AuthService);
    });

    describe('validateJwtAccessStrategy', () => {
        it('throws AuthJwtAccessTokenInvalidException when the payload fails the shape check', () => {
            authUtil.isTokenPayloadValid.mockReturnValue(false);

            let thrown: unknown;
            try {
                service.validateJwtAccessStrategy(accessPayload);
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

            const result = service.validateJwtAccessStrategy(accessPayload);

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
                service.validateJwtAccessSession(identified, null);
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
                service.validateJwtAccessSession(identified, 'different-jti');
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

            const result = service.validateJwtAccessSession(
                identified,
                'jti-value'
            );

            expect(result).toBe(identified);
        });
    });

    describe('validateJwtAccessGuard', () => {
        it('rethrows a typed strategy exception as is', () => {
            const err = new AuthProviderUnavailableException(new Error('down'));
            const info = new Error('info');

            let thrown: unknown;
            try {
                service.validateJwtAccessGuard(err, accessPayload, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(err);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('wraps any other strategy error in AppUnknownException carrying the raw error', () => {
            const err = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );

            let thrown: unknown;
            try {
                service.validateJwtAccessGuard(
                    err,
                    accessPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AppUnknownException);
            expect(thrown).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                rawError: err,
                message: 'Validating the JWT session failed',
            });
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws the provider outage found in the passport info', () => {
            const info = new Error('jwks endpoint down');
            const unavailable = new AuthProviderUnavailableException(info);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            let thrown: unknown;
            try {
                service.validateJwtAccessGuard(null, null, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(info);
        });

        it('throws the AuthJwtAccessTokenInvalidException fallback carrying the passport info when no user and no outage', () => {
            const info = new Error('no auth header');
            authUtil.toProviderUnavailableException.mockReturnValue(null);

            let thrown: unknown;
            try {
                service.validateJwtAccessGuard(null, null, info);
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
            const result = service.validateJwtAccessGuard(
                null,
                accessPayload,
                new Error('info')
            );

            expect(result).toBe(accessPayload);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });
    });

    describe('validateJwtRefreshStrategy', () => {
        it('throws AuthJwtRefreshTokenInvalidException when the payload fails the shape check', async () => {
            authUtil.isTokenPayloadValid.mockReturnValue(false);

            await expect(
                service.validateJwtRefreshStrategy(refreshPayload)
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
                await service.validateJwtRefreshStrategy(refreshPayload);

            expect(result).toBe(refreshPayload);
        });
    });

    describe('validateJwtRefreshGuard', () => {
        it('rethrows a typed strategy exception as is', () => {
            const err = new AuthProviderUnavailableException(new Error('down'));
            const info = new Error('info');

            let thrown: unknown;
            try {
                service.validateJwtRefreshGuard(err, refreshPayload, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(err);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('wraps any other strategy error in AppUnknownException carrying the raw error', () => {
            const err = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );

            let thrown: unknown;
            try {
                service.validateJwtRefreshGuard(
                    err,
                    refreshPayload,
                    new Error('info')
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AppUnknownException);
            expect(thrown).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                rawError: err,
                message: 'Validating the JWT session failed',
            });
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws the provider outage found in the passport info', () => {
            const info = new Error('jwks endpoint down');
            const unavailable = new AuthProviderUnavailableException(info);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            let thrown: unknown;
            try {
                service.validateJwtRefreshGuard(null, null, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(info);
        });

        it('throws the AuthJwtRefreshTokenInvalidException fallback carrying the passport info when no user and no outage', () => {
            const info = new Error('no auth header');
            authUtil.toProviderUnavailableException.mockReturnValue(null);

            let thrown: unknown;
            try {
                service.validateJwtRefreshGuard(null, null, info);
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
            const result = service.validateJwtRefreshGuard(
                null,
                refreshPayload,
                new Error('info')
            );

            expect(result).toBe(refreshPayload);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });
    });

    describe('validateOAuthApple', () => {
        it('returns the mapped social payload', async () => {
            const applePayload = {
                email: 'jane@example.com',
                email_verified: true,
            } as VerifyAppleIdTokenResponse;
            authSocialService.verifyApple.mockResolvedValue(applePayload);

            const result = await service.validateOAuthApple('id-token');

            expect(result).toEqual({
                email: 'jane@example.com',
                emailVerified: true,
            });
            expect(authSocialService.verifyApple).toHaveBeenCalledWith(
                'id-token'
            );
        });

        it('rethrows AuthSocialAppleNotConfiguredException unwrapped', async () => {
            const notConfigured = new AuthSocialAppleNotConfiguredException();
            authSocialService.verifyApple.mockRejectedValue(notConfigured);

            const rejection = service.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(notConfigured);
        });

        it('rethrows AuthSocialAppleInvalidException unwrapped', async () => {
            const invalid = new AuthSocialAppleInvalidException(
                'Apple token payload does not contain email'
            );
            authSocialService.verifyApple.mockRejectedValue(invalid);

            const rejection = service.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(invalid);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws AuthProviderUnavailableException when the Apple endpoint is unreachable', async () => {
            const cause = new Error('network down');
            const unavailable = new AuthProviderUnavailableException(cause);
            authSocialService.verifyApple.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            const rejection = service.validateOAuthApple('id-token');

            await expect(rejection).rejects.toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(cause);
        });

        it('wraps a verification failure in AuthSocialAppleInvalidException', async () => {
            const cause = new Error('apple verification failed');
            authSocialService.verifyApple.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(null);

            const rejection = service.validateOAuthApple('id-token');

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
            authSocialService.verifyGoogle.mockResolvedValue(googlePayload);

            const result = await service.validateOAuthGoogle('id-token');

            expect(result).toEqual({
                email: 'jane@example.com',
                emailVerified: true,
            });
        });

        it('defaults email and emailVerified when the payload omits them', async () => {
            const googlePayload = {} as TokenPayload;
            authSocialService.verifyGoogle.mockResolvedValue(googlePayload);

            const result = await service.validateOAuthGoogle('id-token');

            expect(result).toEqual({ email: '', emailVerified: false });
        });

        it('rethrows AuthSocialGoogleNotConfiguredException unwrapped', async () => {
            const notConfigured = new AuthSocialGoogleNotConfiguredException();
            authSocialService.verifyGoogle.mockRejectedValue(notConfigured);

            const rejection = service.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(notConfigured);
        });

        it('rethrows AuthSocialGoogleInvalidException unwrapped', async () => {
            const invalid = new AuthSocialGoogleInvalidException(
                'Google token payload does not contain email'
            );
            authSocialService.verifyGoogle.mockRejectedValue(invalid);

            const rejection = service.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(invalid);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws AuthProviderUnavailableException when the Google endpoint is unreachable', async () => {
            const cause = new Error('network down');
            const unavailable = new AuthProviderUnavailableException(cause);
            authSocialService.verifyGoogle.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            const rejection = service.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toBe(unavailable);
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(cause);
        });

        it('wraps a verification failure in AuthSocialGoogleInvalidException', async () => {
            const cause = new Error('google verification failed');
            authSocialService.verifyGoogle.mockRejectedValue(cause);
            authUtil.toProviderUnavailableException.mockReturnValue(null);

            const rejection = service.validateOAuthGoogle('id-token');

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

    describe('assertJwtGuardError', () => {
        it('rethrows a typed exception as is', () => {
            const err = new AuthJwtAccessTokenInvalidException();

            expect(() =>
                service['assertJwtGuardError'](err, new Error('info'))
            ).toThrow(err);
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('wraps another error in AppUnknownException', () => {
            const err = new Error('boom');

            let thrown: unknown;
            try {
                service['assertJwtGuardError'](err, new Error('info'));
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AppUnknownException);
            expect(thrown).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                rawError: err,
                message: 'Validating the JWT session failed',
            });
            expect(
                authUtil.toProviderUnavailableException
            ).not.toHaveBeenCalled();
        });

        it('throws the provider-unavailable exception built from info', () => {
            const info = new Error('redis down');
            const unavailable = new AuthProviderUnavailableException(info);
            authUtil.toProviderUnavailableException.mockReturnValue(
                unavailable
            );

            expect(() => service['assertJwtGuardError'](null, info)).toThrow(
                unavailable
            );
            expect(
                authUtil.toProviderUnavailableException
            ).toHaveBeenCalledWith(info);
        });

        it('returns when err is null and info maps to no exception', () => {
            authUtil.toProviderUnavailableException.mockReturnValue(null);

            expect(() =>
                service['assertJwtGuardError'](null, new Error('info'))
            ).not.toThrow();
        });
    });
});
