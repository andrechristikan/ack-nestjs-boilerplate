import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { Duration } from 'luxon';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';

describe('AuthUtil', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let util: AuthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
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

    describe('generateJti', () => {
        it('generates a random 32-character jti', () => {
            helperStringService.random.mockReturnValue('random-jti-value');

            const result = util.generateJti();

            expect(result).toBe('random-jti-value');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
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
        it('compares the SHA-256 hashes of the session jti and the token jti', () => {
            helperHashService.sha256Hash.mockImplementation(
                value => `hash-${value}`
            );
            helperHashService.sha256Compare.mockReturnValue(true);

            const result = util.isJtiMatch('session-jti', 'token-jti');

            expect(result).toBe(true);
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'hash-session-jti',
                'hash-token-jti'
            );
        });

        it('returns false when the hashes differ', () => {
            helperHashService.sha256Hash.mockReturnValue('hash');
            helperHashService.sha256Compare.mockReturnValue(false);

            expect(util.isJtiMatch('session-jti', 'token-jti')).toBe(false);
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
});
