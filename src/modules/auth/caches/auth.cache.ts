import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Auth cache: two-factor challenge tokens and attempt locking. */
@Injectable()
export class AuthCache {
    private readonly logger = new Logger(AuthCache.name);
    private readonly twoFactorChallengeKeyPattern: string;
    private readonly twoFactorChallengeTtlInMs: number;
    private readonly twoFactorLockKeyPattern: string;
    private readonly twoFactorMaxAttempt: number;
    private readonly twoFactorLockAttemptDurationInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService
    ) {
        this.twoFactorChallengeKeyPattern = this.configService.get<string>(
            'auth.twoFactor.challengeKeyPattern'
        )!;
        this.twoFactorChallengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        )!;
        this.twoFactorLockKeyPattern = this.configService.get<string>(
            'auth.twoFactor.lockKeyPattern'
        )!;
        this.twoFactorMaxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
        this.twoFactorLockAttemptDurationInMs = this.configService.get<number>(
            'auth.twoFactor.lockAttemptDurationInMs'
        )!;
    }

    private buildTwoFactorChallengeKey(token: string): string {
        return this.twoFactorChallengeKeyPattern.replace(
            '{token}',
            () => token
        );
    }

    private buildTwoFactorLockKey(userId: string): string {
        return this.twoFactorLockKeyPattern.replace('{userId}', () => userId);
    }

    /** Stores the challenge payload under a random token with a TTL; the write is the authority and throws. */
    async setTwoFactorChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        const challengeToken = this.helperStringService.random(48);
        const key = this.buildTwoFactorChallengeKey(challengeToken);
        await this.cacheManager.set<IAuthTwoFactorChallengeCache>(
            key,
            cachePayload,
            this.twoFactorChallengeTtlInMs
        );

        return { challengeToken, expiresInMs: this.twoFactorChallengeTtlInMs };
    }

    async getTwoFactorChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = this.buildTwoFactorChallengeKey(token);
        const cached =
            await this.cacheManager.get<IAuthTwoFactorChallengeCache>(key);

        return cached ?? null;
    }

    async deleteTwoFactorChallenge(token: string): Promise<void> {
        const key = this.buildTwoFactorChallengeKey(token);
        try {
            await this.cacheManager.del(key);
        } catch (error: unknown) {
            this.logger.error(
                error,
                'Two-factor challenge cache delete failed'
            );
        }
    }

    /** Locks two-factor with an exponential TTL `2^(attempt/maxAttempt) * lockAttemptDurationInMs`; the write is the authority and throws. */
    async setTwoFactorLock(user: IUser): Promise<void> {
        const key = this.buildTwoFactorLockKey(user.id);
        const ttlExponentialInMs =
            Math.pow(
                2,
                (user.twoFactor?.attempt ?? 0) / this.twoFactorMaxAttempt
            ) * this.twoFactorLockAttemptDurationInMs;
        await this.cacheManager.set<boolean>(key, true, ttlExponentialInMs);
    }

    /** Remaining lock duration in milliseconds, 0 when not locked. */
    async getTwoFactorLockTtlInMs(user: IUser): Promise<number> {
        const key = this.buildTwoFactorLockKey(user.id);
        const ttl = await this.cacheManager.ttl(key);
        const expiresAt = ttl ?? null;
        if (expiresAt === null) {
            return 0;
        }

        const now = this.helperDateService.create();
        const nowTimestamp = this.helperDateService.getTimestamp(now);

        return Math.max(0, expiresAt - nowTimestamp);
    }

    async deleteTwoFactorLock(user: IUser): Promise<void> {
        const key = this.buildTwoFactorLockKey(user.id);
        try {
            await this.cacheManager.del(key);
        } catch (error: unknown) {
            this.logger.error(error, 'Two-factor lock cache delete failed');
        }
    }
}
