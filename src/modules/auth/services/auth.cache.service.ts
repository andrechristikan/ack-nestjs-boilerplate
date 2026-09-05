import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { IAuthCacheService } from '@modules/auth/interfaces/auth.cache.service.interface';
import {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Auth cache service: two-factor challenge tokens and attempt locking. */
@Injectable()
export class AuthCacheService implements IAuthCacheService {
    private readonly challengeKeyPattern: string;
    private readonly challengeTtlInMs: number;
    private readonly lockKeyPattern: string;
    private readonly maxAttempt: number;
    private readonly lockAttemptDurationInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.challengeKeyPattern = this.configService.get<string>(
            'auth.twoFactor.challengeKeyPattern'
        )!;
        this.challengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        )!;
        this.lockKeyPattern = this.configService.get<string>(
            'auth.twoFactor.lockKeyPattern'
        )!;
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
        this.lockAttemptDurationInMs = this.configService.get<number>(
            'auth.twoFactor.lockAttemptDurationInMs'
        )!;
    }

    /** Stores the challenge payload in cache under a random token with a TTL. */
    async createChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        const challengeToken = this.helperStringService.random(48);
        const key = this.challengeKeyPattern.replace('{token}', challengeToken);
        await this.cacheManager.set<IAuthTwoFactorChallengeCache>(
            key,
            cachePayload,
            this.challengeTtlInMs
        );

        return { challengeToken, expiresInMs: this.challengeTtlInMs };
    }

    async getChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = this.challengeKeyPattern.replace('{token}', token);
        const cached =
            await this.cacheManager.get<IAuthTwoFactorChallengeCache>(key);

        return cached ?? null;
    }

    async clearChallenge(token: string): Promise<void> {
        const key = this.challengeKeyPattern.replace('{token}', token);
        await this.cacheManager.del(key);
    }

    /** Locks 2FA in cache with exponential backoff TTL `2^(attempt/maxAttempt) * lockAttemptDurationInMs` to throttle brute force. */
    async lockTwoFactorAttempt(user: IUser): Promise<void> {
        const key = this.lockKeyPattern.replace('{userId}', user.id);
        const ttlExponentialInMs =
            Math.pow(2, (user.twoFactor?.attempt ?? 0) / this.maxAttempt) *
            this.lockAttemptDurationInMs;
        await this.cacheManager.set<boolean>(key, true, ttlExponentialInMs);

        return;
    }

    /** Returns the remaining 2FA lock duration in ms, or 0 when not locked. */
    async getLockTwoFactorAttempt(user: IUser): Promise<number> {
        const key = this.lockKeyPattern.replace('{userId}', user.id);
        const [isLocked, retryAfterMs] = await Promise.all([
            this.cacheManager.get<boolean>(key),
            this.cacheManager.ttl(key),
        ]);

        return isLocked ? (retryAfterMs ?? 0) : 0;
    }

    async clearLockTwoFactorAttempt(user: IUser): Promise<void> {
        const key = this.lockKeyPattern.replace('{userId}', user.id);
        await this.cacheManager.del(key);

        return;
    }
}
