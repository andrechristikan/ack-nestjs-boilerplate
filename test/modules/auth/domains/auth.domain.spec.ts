import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumUserLoginFrom, EnumUserLoginWith } from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { SessionForbiddenException } from '@modules/session/exceptions/session.forbidden.exception';
import { SessionCache } from '@modules/session/caches/session.cache';

describe('AuthDomain', () => {
    const authSocialService = {
        verifyApple: vi.fn<AuthSocialDomain['verifyApple']>(),
        verifyGoogle: vi.fn<AuthSocialDomain['verifyGoogle']>(),
    } satisfies Pick<AuthSocialDomain, 'verifyApple' | 'verifyGoogle'>;
    const sessionCacheService = {
        getLogin: vi.fn<SessionCache['getLogin']>(),
    } satisfies Pick<SessionCache, 'getLogin'>;

    const accessPayload = {
        userId: 'user-id',
        roleId: 'role-id',
        username: 'user',
        email: 'user@example.com',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        sub: 'user-id',
        jti: 'current-jti',
    } satisfies IAuthJwtAccessTokenPayload;
    const refreshPayload = {
        userId: accessPayload.userId,
        sessionId: accessPayload.sessionId,
        deviceOwnershipId: accessPayload.deviceOwnershipId,
        loginAt: accessPayload.loginAt,
        loginFrom: accessPayload.loginFrom,
        loginWith: accessPayload.loginWith,
        sub: accessPayload.sub,
        jti: accessPayload.jti,
    } satisfies IAuthJwtRefreshTokenPayload;

    let service: AuthDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthDomain,
                { provide: AuthSocialDomain, useValue: authSocialService },
                { provide: SessionCache, useValue: sessionCacheService },
            ],
        }).compile();

        service = moduleRef.get(AuthDomain);
    });

    describe('JWT strategy validation', () => {
        it.each([
            ['access', { ...accessPayload, sub: undefined }],
            ['access', { ...accessPayload, jti: undefined }],
            ['refreshInTx', { ...refreshPayload, sessionId: '' }],
        ])('rejects malformed %s token claims', async (kind, payload) => {
            const result =
                kind === 'access'
                    ? service.validateJwtAccessStrategy(
                          payload as IAuthJwtAccessTokenPayload
                      )
                    : service.validateJwtRefreshStrategy(
                          payload as IAuthJwtRefreshTokenPayload
                      );

            await expect(result).rejects.toBeInstanceOf(
                kind === 'access'
                    ? AuthJwtAccessTokenInvalidException
                    : AuthJwtRefreshTokenInvalidException
            );
            expect(sessionCacheService.getLogin).not.toHaveBeenCalled();
        });

        it.each([
            ['missing session', null],
            [
                'rotated jti',
                {
                    userId: 'user-id',
                    sessionId: 'session-id',
                    expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                    jti: 'newer-jti',
                },
            ],
        ])('rejects an access token with a %s', async (_case, session) => {
            sessionCacheService.getLogin.mockResolvedValue(session);

            await expect(
                service.validateJwtAccessStrategy(accessPayload)
            ).rejects.toBeInstanceOf(SessionForbiddenException);
        });

        it('returns an access payload bound to the current session jti', async () => {
            sessionCacheService.getLogin.mockResolvedValue({
                userId: 'user-id',
                sessionId: 'session-id',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'current-jti',
            });

            await expect(
                service.validateJwtAccessStrategy(accessPayload)
            ).resolves.toBe(accessPayload);
            expect(sessionCacheService.getLogin).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
        });

        it('returns a refreshInTx payload bound to the current session jti', async () => {
            sessionCacheService.getLogin.mockResolvedValue({
                userId: 'user-id',
                sessionId: 'session-id',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'current-jti',
            });

            await expect(
                service.validateJwtRefreshStrategy(refreshPayload)
            ).resolves.toBe(refreshPayload);
        });
    });

    describe('JWT guard validation', () => {
        it('maps an access Passport error to the access-token exception', () => {
            expect(() =>
                service.validateJwtAccessGuard(
                    new Error('invalid signature'),
                    accessPayload,
                    new Error('ignored')
                )
            ).toThrow(AuthJwtAccessTokenInvalidException);
        });

        it('maps a missing refreshInTx principal to the refreshInTx-token exception', () => {
            expect(() =>
                service.validateJwtRefreshGuard(
                    undefined as unknown as Error,
                    undefined as unknown as IAuthJwtRefreshTokenPayload,
                    new Error('missing principal')
                )
            ).toThrow(AuthJwtRefreshTokenInvalidException);
        });

        it('returns the validated access principal unchanged', () => {
            expect(
                service.validateJwtAccessGuard(
                    undefined as unknown as Error,
                    accessPayload,
                    undefined as unknown as Error
                )
            ).toBe(accessPayload);
        });
    });

    describe('social validation', () => {
        it('normalizes a verified Apple identity payload', async () => {
            authSocialService.verifyApple.mockResolvedValue({
                iss: 'https://appleid.apple.com',
                aud: 'client-id',
                exp: 1,
                iat: 1,
                sub: 'apple-user',
                c_hash: 'code-hash',
                email: 'user@example.com',
                email_verified: true,
                is_private_email: false,
                auth_time: 1,
                nonce_supported: true,
            });

            await expect(service.validateOAuthApple('token')).resolves.toEqual({
                email: 'user@example.com',
                emailVerified: true,
            });
        });

        it('normalizes missing optional Google fields to safe defaults', async () => {
            authSocialService.verifyGoogle.mockResolvedValue({
                iss: 'accounts.google.com',
                aud: 'client-id',
                exp: 1,
                iat: 1,
                sub: 'google-user',
            });

            await expect(service.validateOAuthGoogle('token')).resolves.toEqual(
                { email: '', emailVerified: false }
            );
        });

        it.each([
            ['Apple', 'validateOAuthApple', 'verifyApple'],
            ['Google', 'validateOAuthGoogle', 'verifyGoogle'],
        ] as const)(
            'maps %s provider failures to the provider-specific exception',
            async (provider, method, collaborator) => {
                authSocialService[collaborator].mockRejectedValue(
                    new Error('provider rejected token')
                );

                await expect(service[method]('token')).rejects.toBeInstanceOf(
                    provider === 'Apple'
                        ? AuthSocialAppleInvalidException
                        : AuthSocialGoogleInvalidException
                );
            }
        );
    });
});
