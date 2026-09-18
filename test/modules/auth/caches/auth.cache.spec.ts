import type { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('AuthCache', () => {
    const cacheSet = vi.fn(
        async (_key: string, value: unknown, _ttl?: number) => value
    );
    const cacheGet = vi.fn(async (_key: string): Promise<unknown> => undefined);
    const cacheDel = vi.fn(async (_key: string) => true);
    const cacheTtl = vi.fn(async (_key: string) => 0);
    const cacheManager = {
        async set<T>(key: string, value: T, ttl?: number): Promise<T> {
            await cacheSet(key, value, ttl);
            return value;
        },
        async get<T>(key: string): Promise<T | undefined> {
            return (await cacheGet(key)) as T | undefined;
        },
        del: cacheDel,
        ttl: cacheTtl,
    } satisfies Pick<Cache, 'set' | 'get' | 'del' | 'ttl'>;
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const configService = new ConfigService({
        'auth.twoFactor.challengeKeyPattern': 'auth:challenge:{token}',
        'auth.twoFactor.challengeTtlInMs': 300_000,
        'auth.twoFactor.lockKeyPattern': 'auth:lock:{userId}',
        'auth.twoFactor.maxAttempt': 5,
        'auth.twoFactor.lockAttemptDurationInMs': 60_000,
    });
    const challenge = {
        userId: 'user-id',
        device: { fingerprint: 'fingerprint' },
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    } satisfies IAuthTwoFactorChallengeCache;
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: {
            id: 'two-factor-id',
            userId: 'user-id',
            secret: 'encrypted-secret',
            iv: 'hex:iv',
            enabled: true,
            requiredSetup: false,
            confirmedAt: now,
            lastUsedAt: null,
            attempt: 5,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            backupCodes: [],
        },
    } satisfies IUser;

    let service: AuthCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = moduleRef.get(AuthCache);
    });

    it('stores a challenge under a random opaque token with its configured TTL', async () => {
        helperStringService.random.mockReturnValue('challenge-token');

        await expect(service.createChallenge(challenge)).resolves.toEqual({
            challengeToken: 'challenge-token',
            expiresInMs: 300_000,
        });
        expect(helperStringService.random).toHaveBeenCalledWith(48);
        expect(cacheSet).toHaveBeenCalledWith(
            'auth:challenge:challenge-token',
            challenge,
            300_000
        );
    });

    it('normalizes a missing cached challenge to null', async () => {
        cacheGet.mockResolvedValue(undefined);

        await expect(service.getChallenge('missing')).resolves.toBeNull();
        expect(cacheGet).toHaveBeenCalledWith('auth:challenge:missing');
    });

    it('applies exponential lock duration from the current attempt count', async () => {
        await service.lockTwoFactorAttempt(user);

        expect(cacheSet).toHaveBeenCalledWith(
            'auth:lock:user-id',
            true,
            120_000
        );
    });

    it('returns the remaining lock TTL only when the lock exists', async () => {
        cacheGet.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        cacheTtl.mockResolvedValue(45_000);

        await expect(service.getLockTwoFactorAttempt(user)).resolves.toBe(
            45_000
        );
        await expect(service.getLockTwoFactorAttempt(user)).resolves.toBe(0);
    });
});
