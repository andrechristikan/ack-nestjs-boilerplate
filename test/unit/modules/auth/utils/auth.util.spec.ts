import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { Duration } from 'luxon';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('AuthUtil', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const configValues: Record<string, number> = {
        'auth.jwt.jtiLength': 40,
    };
    let util: AuthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key => configValues[key]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        util = module.get(AuthUtil);
    });

    describe('createPayloadAccessToken', () => {
        it('assembles the access token payload from the user and login context', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const user: User = {
                id: 'user-1',
                name: 'Jane Doe',
                username: 'jane',
                isVerified: true,
                verifiedAt: null,
                email: 'jane@example.com',
                roleId: 'role-1',
                password: 'hashed',
                passwordExpired: null,
                passwordCreated: null,
                passwordAttempt: null,
                signUpAt: loginAt,
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                status: EnumUserStatus.active,
                gender: null,
                countryId: 'country-1',
                lastLoginAt: null,
                lastIPAddress: null,
                lastLoginFrom: null,
                lastLoginWith: null,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                photo: null,
                createdAt: loginAt,
                createdBy: null,
                updatedAt: loginAt,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
            };

            const result = util.createPayloadAccessToken(
                user,
                'session-1',
                'device-ownership-1',
                loginAt,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );

            expect(result).toEqual({
                userId: user.id,
                roleId: user.roleId,
                username: user.username,
                email: user.email,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('derives the minimal refresh token payload from an access token payload', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const accessPayload: IAuthJwtAccessTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'jane@example.com',
                username: 'jane',
                userId: 'user-1',
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                roleId: 'role-1',
            };

            const result = util.createPayloadRefreshToken(accessPayload);

            expect(result).toEqual({
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                userId: 'user-1',
            });
        });
    });

    describe('toToken', () => {
        it('shapes the bearer token pair with the role type and the access expiry', () => {
            const createdAt = new Date('2026-01-01T00:00:00.000Z');
            const user: IUser = {
                id: 'user-1',
                name: 'Jane Doe',
                username: 'jane',
                isVerified: true,
                verifiedAt: null,
                email: 'jane@example.com',
                roleId: 'role-1',
                password: 'hashed',
                passwordExpired: null,
                passwordCreated: null,
                passwordAttempt: null,
                signUpAt: createdAt,
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                status: EnumUserStatus.active,
                gender: null,
                countryId: 'country-1',
                lastLoginAt: null,
                lastIPAddress: null,
                lastLoginFrom: null,
                lastLoginWith: null,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                photo: null,
                createdAt,
                createdBy: null,
                updatedAt: createdAt,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
                role: {
                    id: 'role-1',
                    name: 'user',
                    description: null,
                    type: EnumRoleType.user,
                    isImmutable: false,
                    createdAt,
                    createdBy: null,
                    updatedAt: createdAt,
                    updatedBy: null,
                    policies: [],
                },
                twoFactor: null,
            };

            const result = util.toToken(
                user,
                'signed-access-token',
                'signed-refresh-token',
                900
            );

            expect(result).toEqual({
                tokenType: 'Bearer',
                roleType: EnumRoleType.user,
                expiresIn: 900,
                accessToken: 'signed-access-token',
                refreshToken: 'signed-refresh-token',
            });
        });
    });

    describe('generateJti', () => {
        it('generates a random jti of the configured length', () => {
            helperStringService.random.mockReturnValue('random-jti-value');

            const result = util.generateJti();

            expect(result).toBe('random-jti-value');
            expect(helperStringService.random).toHaveBeenCalledWith(40);
        });
    });

    describe('createLoginIdentifiers', () => {
        it('mints a session id and a jti', () => {
            databaseUtil.createId.mockReturnValue('session-1');
            helperStringService.random.mockReturnValue('jti-value');

            const result = util.createLoginIdentifiers();

            expect(result).toEqual({
                sessionId: 'session-1',
                jti: 'jti-value',
            });
            expect(databaseUtil.createId).toHaveBeenCalledTimes(1);
            expect(helperStringService.random).toHaveBeenCalledWith(40);
        });
    });

    describe('isTokenPayloadValid', () => {
        const payload = {
            userId: 'user-1',
            sessionId: 'session-1',
            jti: 'jti-value',
            sub: 'user-1',
        } as IAuthJwtAccessTokenPayload;

        it('accepts a payload carrying sub, sessionId and jti strings', () => {
            expect(util.isTokenPayloadValid(payload)).toBe(true);
        });

        it('rejects a payload without sub', () => {
            expect(util.isTokenPayloadValid({ ...payload, sub: '' })).toBe(
                false
            );
        });

        it('rejects a payload whose sub is not a string', () => {
            expect(
                util.isTokenPayloadValid({
                    ...payload,
                    sub: 42 as unknown as string,
                })
            ).toBe(false);
        });

        it('rejects a payload without sessionId', () => {
            expect(
                util.isTokenPayloadValid({ ...payload, sessionId: '' })
            ).toBe(false);
        });

        it('rejects a payload without jti', () => {
            const { jti: _jti, ...withoutJti } = payload;

            expect(util.isTokenPayloadValid(withoutJti)).toBe(false);
        });

        it('rejects a payload whose jti is not a string', () => {
            expect(
                util.isTokenPayloadValid({
                    ...payload,
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

            const result = util.isJtiMatch('hash-token-jti', 'token-jti');

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

            expect(util.isJtiMatch('stored-digest', 'token-jti')).toBe(false);
        });
    });

    describe('remainingSeconds', () => {
        it('returns the whole seconds between now and the expiry', () => {
            const today = new Date('2026-01-02T00:00:00.000Z');
            const expiredAt = new Date('2026-01-08T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperDateService.createFromTimestamp.mockReturnValue(expiredAt);
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ seconds: 518400 })
            );

            const result = util.remainingSeconds(
                Math.floor(expiredAt.getTime() / 1000)
            );

            expect(result).toBe(518400);
            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                expiredAt.getTime()
            );
            expect(helperDateService.diff).toHaveBeenCalledWith(
                expiredAt,
                today
            );
        });

        it('falls back to milliseconds when the duration carries no whole seconds', () => {
            helperDateService.create.mockReturnValue(new Date());
            helperDateService.createFromTimestamp.mockReturnValue(new Date());
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ milliseconds: 2500 })
            );

            expect(util.remainingSeconds(1)).toBe(2);
        });

        it('treats a missing expiry as the epoch', () => {
            helperDateService.create.mockReturnValue(new Date());
            helperDateService.createFromTimestamp.mockReturnValue(new Date());
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ milliseconds: 0 })
            );

            util.remainingSeconds(null);

            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                0
            );
        });
    });

    describe('toProviderUnavailableException', () => {
        it('maps a jwks-rsa fetch failure flagged isEndpointUnavailable', () => {
            const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
                isEndpointUnavailable: true,
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('maps a JwksError raised by an endpoint that answers no usable key', () => {
            const error = Object.assign(new Error('Not Found'), {
                name: 'JwksError',
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('maps a Google certificate retrieval failure', () => {
            const error = new Error(
                'Failed to retrieve verification certificates: request to https://www.googleapis.com/oauth2/v1/certs failed'
            );

            const result = util.toProviderUnavailableException(error);

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

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result?.rawError).toBe(error);
        });

        it('returns null for SigningKeyNotFoundError', () => {
            const error = Object.assign(new Error('no matching kid'), {
                name: 'SigningKeyNotFoundError',
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeNull();
        });

        it('returns null for JwksRateLimitError', () => {
            const error = Object.assign(new Error('Too many requests'), {
                name: 'JwksRateLimitError',
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeNull();
        });

        it('returns null for a token verification error', () => {
            const error = Object.assign(new Error('invalid signature'), {
                name: 'JsonWebTokenError',
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeNull();
        });

        it('returns null for an error whose code is not a network code', () => {
            const error = Object.assign(new Error('bad'), {
                code: 'ERR_UNKNOWN_CODE',
            });

            const result = util.toProviderUnavailableException(error);

            expect(result).toBeNull();
        });

        it('returns null for a value that is not an Error', () => {
            const result = util.toProviderUnavailableException('boom');

            expect(result).toBeNull();
        });

        it('returns null when passport hands no info', () => {
            const result = util.toProviderUnavailableException(null);

            expect(result).toBeNull();
        });
    });

    describe('toJwtGuardException', () => {
        const fallback = new AuthJwtAccessTokenInvalidException(
            new Error('info')
        );

        it('returns a typed exception from the strategy unchanged', () => {
            const err = new SessionRevokedException();

            const result = util.toJwtGuardException(
                err,
                new Error('info'),
                fallback
            );

            expect(result).toBe(err);
        });

        it('wraps an unknown strategy error in AppUnknownException with the raw error, even when info is an outage', () => {
            const err = new Error('redis down');
            const info = Object.assign(new Error('network'), {
                code: 'ECONNREFUSED',
            });

            const result = util.toJwtGuardException(err, info, fallback);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result).toMatchObject({
                rawError: err,
                message: 'Validating the JWT session failed',
            });
        });

        it('returns AuthProviderUnavailableException when passport info is a key endpoint outage', () => {
            const info = Object.assign(new Error('jwks endpoint down'), {
                isEndpointUnavailable: true,
            });

            const result = util.toJwtGuardException(null, info, fallback);

            expect(result).toBeInstanceOf(AuthProviderUnavailableException);
            expect(result).toMatchObject({ rawError: info });
        });

        it('returns the fallback for a signing key miss or a bad token', () => {
            const info = Object.assign(new Error('no matching kid'), {
                name: 'SigningKeyNotFoundError',
            });

            const result = util.toJwtGuardException(null, info, fallback);

            expect(result).toBe(fallback);
        });

        it('returns the fallback when passport reports no user and no error', () => {
            const result = util.toJwtGuardException(
                null,
                new Error('no auth header'),
                fallback
            );

            expect(result).toBe(fallback);
        });
    });
});
