import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TokenPayload } from 'google-auth-library';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
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
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
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
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        service = module.get(AuthService);
    });

    describe('validateJwtAccessStrategy', () => {
        it('throws AuthJwtAccessTokenInvalidException when the payload fails the shape check', () => {
            let thrown: unknown;
            try {
                service.validateJwtAccessStrategy({
                    ...accessPayload,
                    sub: '',
                });
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
        });

        it('returns the payload when the shape check passes', () => {
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
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('throws SessionRevokedException when the cached jti does not match', () => {
            helperHashService.sha256Hash.mockReturnValue('hash-jti-value');
            helperHashService.sha256Compare.mockReturnValue(false);

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
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'jti-value'
            );
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'different-jti',
                'hash-jti-value'
            );
        });

        it('returns the payload when the stored jti matches', () => {
            helperHashService.sha256Hash.mockReturnValue('hash-jti-value');
            helperHashService.sha256Compare.mockReturnValue(true);

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
        });

        it('wraps any other strategy error in AppUnknownException carrying the raw error', () => {
            const err = new Error('Connection is closed.');

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
        });

        it('throws the provider outage found in the passport info', () => {
            const info = Object.assign(new Error('jwks endpoint down'), {
                isEndpointUnavailable: true,
            });

            let thrown: unknown;
            try {
                service.validateJwtAccessGuard(null, null, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthProviderUnavailableException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.providerUnavailable
                    ],
                messagePath: 'auth.error.providerUnavailable',
                rawError: info,
            });
        });

        it('throws the AuthJwtAccessTokenInvalidException fallback carrying the passport info when no user and no outage', () => {
            const info = new Error('no auth header');

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
        });
    });

    describe('validateJwtRefreshStrategy', () => {
        it('throws AuthJwtRefreshTokenInvalidException when the payload fails the shape check', async () => {
            await expect(
                service.validateJwtRefreshStrategy({
                    ...refreshPayload,
                    sub: '',
                })
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

        it('returns the payload when the shape check passes', async () => {
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
        });

        it('wraps any other strategy error in AppUnknownException carrying the raw error', () => {
            const err = new Error('Connection is closed.');

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
        });

        it('throws the provider outage found in the passport info', () => {
            const info = Object.assign(new Error('jwks endpoint down'), {
                isEndpointUnavailable: true,
            });

            let thrown: unknown;
            try {
                service.validateJwtRefreshGuard(null, null, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthProviderUnavailableException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.providerUnavailable
                    ],
                messagePath: 'auth.error.providerUnavailable',
                rawError: info,
            });
        });

        it('throws the AuthJwtRefreshTokenInvalidException fallback carrying the passport info when no user and no outage', () => {
            const info = new Error('no auth header');

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
        });

        it('throws AuthProviderUnavailableException when the Apple endpoint is unreachable', async () => {
            const cause = Object.assign(new Error('network down'), {
                code: 'ECONNREFUSED',
            });
            authSocialService.verifyApple.mockRejectedValue(cause);

            const rejection = service.validateOAuthApple('id-token');

            await expect(rejection).rejects.toMatchObject({
                constructor: AuthProviderUnavailableException,
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.providerUnavailable
                    ],
                messagePath: 'auth.error.providerUnavailable',
                rawError: cause,
            });
        });

        it('wraps a verification failure in AuthSocialAppleInvalidException', async () => {
            const cause = new Error('apple verification failed');
            authSocialService.verifyApple.mockRejectedValue(cause);

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
        });

        it('throws AuthProviderUnavailableException when the Google endpoint is unreachable', async () => {
            const cause = Object.assign(new Error('network down'), {
                code: 'ECONNREFUSED',
            });
            authSocialService.verifyGoogle.mockRejectedValue(cause);

            const rejection = service.validateOAuthGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                constructor: AuthProviderUnavailableException,
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.providerUnavailable
                    ],
                messagePath: 'auth.error.providerUnavailable',
                rawError: cause,
            });
        });

        it('wraps a verification failure in AuthSocialGoogleInvalidException', async () => {
            const cause = new Error('google verification failed');
            authSocialService.verifyGoogle.mockRejectedValue(cause);

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
        });

        it('throws the provider-unavailable exception built from info', () => {
            const info = Object.assign(new Error('redis down'), {
                code: 'ECONNREFUSED',
            });

            let thrown: unknown;
            try {
                service['assertJwtGuardError'](null, info);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthProviderUnavailableException);
            expect(thrown).toMatchObject({ rawError: info });
        });

        it('returns when err is null and info maps to no exception', () => {
            expect(() =>
                service['assertJwtGuardError'](null, new Error('info'))
            ).not.toThrow();
        });
    });

    describe('isTokenPayloadValid', () => {
        it('accepts a payload carrying sub, sessionId and jti strings', () => {
            expect(service['isTokenPayloadValid'](accessPayload)).toBe(true);
        });

        it('rejects a payload without sub', () => {
            expect(
                service['isTokenPayloadValid']({ ...accessPayload, sub: '' })
            ).toBe(false);
        });

        it('rejects a payload whose sub is not a string', () => {
            expect(
                service['isTokenPayloadValid']({
                    ...accessPayload,
                    sub: 42 as unknown as string,
                })
            ).toBe(false);
        });

        it('rejects a payload without sessionId', () => {
            expect(
                service['isTokenPayloadValid']({
                    ...accessPayload,
                    sessionId: '',
                })
            ).toBe(false);
        });

        it('rejects a payload without jti', () => {
            const { jti: _jti, ...withoutJti } = accessPayload;

            expect(service['isTokenPayloadValid'](withoutJti)).toBe(false);
        });

        it('rejects a payload whose jti is not a string', () => {
            expect(
                service['isTokenPayloadValid']({
                    ...accessPayload,
                    jti: 1 as unknown as string,
                })
            ).toBe(false);
        });
    });

    describe('isJtiMatch', () => {
        it('compares the stored jti digest with the SHA-256 hash of the token jti', () => {
            helperHashService.sha256Hash.mockImplementation(
                value => `hash-${value}`
            );
            helperHashService.sha256Compare.mockReturnValue(true);

            const result = service['isJtiMatch']('hash-token-jti', 'token-jti');

            expect(result).toBe(true);
            expect(helperHashService.sha256Hash).toHaveBeenCalledTimes(1);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'token-jti'
            );
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'hash-token-jti',
                'hash-token-jti'
            );
        });

        it('returns false when the digests differ', () => {
            helperHashService.sha256Hash.mockReturnValue('hash');
            helperHashService.sha256Compare.mockReturnValue(false);

            expect(service['isJtiMatch']('stored-digest', 'token-jti')).toBe(
                false
            );
        });
    });

    describe('toProviderUnavailableException', () => {
        it('maps a jwks-rsa fetch failure flagged isEndpointUnavailable', () => {
            const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
                isEndpointUnavailable: true,
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('maps a JwksError raised by an endpoint that answers no usable key', () => {
            const error = Object.assign(new Error('Not Found'), {
                name: 'JwksError',
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('maps a Google certificate retrieval failure', () => {
            const error = new Error(
                'Failed to retrieve verification certificates: request to https://www.googleapis.com/oauth2/v1/certs failed'
            );

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it.each([
            'ECONNREFUSED',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'EAI_AGAIN',
            'EHOSTUNREACH',
            'ENETUNREACH',
        ])('maps a network error with code %s', code => {
            const error = Object.assign(new Error('network'), { code });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('returns null for SigningKeyNotFoundError', () => {
            const error = Object.assign(new Error('no matching kid'), {
                name: 'SigningKeyNotFoundError',
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeNull();
        });

        it('returns null for JwksRateLimitError', () => {
            const error = Object.assign(new Error('Too many requests'), {
                name: 'JwksRateLimitError',
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeNull();
        });

        it('returns null for a token verification error', () => {
            const error = Object.assign(new Error('invalid signature'), {
                name: 'JsonWebTokenError',
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeNull();
        });

        it('returns null for an error whose code is not a network code', () => {
            const error = Object.assign(new Error('bad'), {
                code: 'ERR_UNKNOWN_CODE',
            });

            const result = service['toProviderUnavailableException'](error);

            expect(result).toBeNull();
        });

        it('returns null for a value that is not an Error', () => {
            const result = service['toProviderUnavailableException']('boom');

            expect(result).toBeNull();
        });

        it('returns null when passport hands no info', () => {
            const result = service['toProviderUnavailableException'](null);

            expect(result).toBeNull();
        });
    });
});
