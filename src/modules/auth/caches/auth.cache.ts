import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type KeyvRedis from '@keyv/redis';
import type Keyv from 'keyv';

/** Auth cache: two-factor challenge tokens. */
@Injectable()
export class AuthCache {
    private readonly logger = new Logger(AuthCache.name);
    private readonly twoFactorChallengeKeyPattern: string;
    private readonly twoFactorChallengeTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.twoFactorChallengeKeyPattern = this.configService.get<string>(
            'auth.twoFactor.challengeKeyPattern'
        )!;
        this.twoFactorChallengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        )!;
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
    }

    private buildTwoFactorChallengeKey(token: string): string {
        return this.twoFactorChallengeKeyPattern.replace(
            '{token}',
            () => token
        );
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

    /** Claims the challenge with one GETDEL on the store client, so one caller alone receives it; a store failure throws RedisUnavailableException. */
    async consumeTwoFactorChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const store = this.getStore();
        const challengeKey = this.buildTwoFactorChallengeKey(token);
        const key = store.createKeyPrefix(challengeKey, store.namespace);
        let claimed: string | null;
        try {
            const client = await store.getClient();
            claimed = await client.getDel(key);
        } catch (error: unknown) {
            this.logger.error(error, 'Two-factor challenge claim failed');

            throw new RedisUnavailableException();
        }

        if (claimed === null) {
            return null;
        }

        const entry =
            await this.keyv.deserializeData<IAuthTwoFactorChallengeCache>(
                claimed
            );

        return entry?.value ?? null;
    }
}
