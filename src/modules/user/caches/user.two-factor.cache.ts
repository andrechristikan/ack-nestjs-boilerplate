import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** User two-factor cache: the verification attempt lock. */
@Injectable()
export class UserTwoFactorCache {
    private readonly logger = new Logger(UserTwoFactorCache.name);
    private readonly twoFactorLockKeyPattern: string;
    private readonly maxAttempt: number;
    private readonly twoFactorLockAttemptDurationInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.twoFactorLockKeyPattern = this.configService.get<string>(
            'auth.twoFactor.lockKeyPattern'
        )!;
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
        this.twoFactorLockAttemptDurationInMs = this.configService.get<number>(
            'auth.twoFactor.lockAttemptDurationInMs'
        )!;
    }

    private buildTwoFactorLockKey(userId: string): string {
        return this.twoFactorLockKeyPattern.replace('{userId}', () => userId);
    }

    /** Locks two-factor with an exponential TTL `2^(attempt/maxAttempt) * twoFactorLockAttemptDurationInMs`; the write is the authority and throws. */
    async setTwoFactorLock(user: IUser): Promise<void> {
        const key = this.buildTwoFactorLockKey(user.id);
        const ttlExponentialInMs =
            Math.pow(2, (user.twoFactor?.attempt ?? 0) / this.maxAttempt) *
            this.twoFactorLockAttemptDurationInMs;
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
