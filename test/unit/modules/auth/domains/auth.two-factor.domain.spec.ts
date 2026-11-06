import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';

describe('AuthTwoFactorDomain', () => {
    const authCache: MockProxy<AuthCache> = mock<AuthCache>();

    let domain: AuthTwoFactorDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorDomain,
                { provide: AuthCache, useValue: authCache },
            ],
        }).compile();

        domain = module.get(AuthTwoFactorDomain);
    });

    describe('createChallenge', () => {
        it('stores the challenge payload and answers the token', async () => {
            const payload = {
                userId: 'user-1',
                device: {
                    fingerprint: 'device-1',
                    name: null,
                    platform: EnumDevicePlatform.web,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            authCache.setTwoFactorChallenge.mockResolvedValue({
                challengeToken: 'token-1',
                expiresInMs: 1000,
            });

            await expect(domain.createChallenge(payload)).resolves.toEqual({
                challengeToken: 'token-1',
                expiresInMs: 1000,
            });
            expect(authCache.setTwoFactorChallenge).toHaveBeenCalledWith(
                payload
            );
        });
    });

    describe('getChallenge', () => {
        it('returns the challenge of a token', async () => {
            const challenge = {
                userId: 'user-1',
                device: {
                    fingerprint: 'device-1',
                    name: null,
                    platform: EnumDevicePlatform.web,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            authCache.getTwoFactorChallenge.mockResolvedValue(challenge);

            await expect(domain.getChallenge('token-1')).resolves.toBe(
                challenge
            );
            expect(authCache.getTwoFactorChallenge).toHaveBeenCalledWith(
                'token-1'
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException when the token has no challenge', async () => {
            authCache.getTwoFactorChallenge.mockResolvedValue(null);

            await expect(domain.getChallenge('token-1')).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
        });
    });

    describe('consumeChallenge', () => {
        it('claims the challenge of a token', async () => {
            const challenge = {
                userId: 'user-1',
                device: {
                    fingerprint: 'device-1',
                    name: null,
                    platform: EnumDevicePlatform.web,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            authCache.consumeTwoFactorChallenge.mockResolvedValue(challenge);

            await expect(domain.consumeChallenge('token-1')).resolves.toBe(
                challenge
            );
            expect(authCache.consumeTwoFactorChallenge).toHaveBeenCalledWith(
                'token-1'
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException when another caller already claimed the challenge', async () => {
            authCache.consumeTwoFactorChallenge.mockResolvedValue(null);

            await expect(
                domain.consumeChallenge('token-1')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
        });
    });
});
