import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

@Injectable()
export class AuthCache {
    private readonly logger = new Logger(AuthCache.name);
    private readonly twoFactorChallengeKeyPattern: string;
    private readonly twoFactorChallengeTtlInMs: number;

    constructor(
        @Inject(RedisCacheClient) private readonly redis: Redis,
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

    private buildTwoFactorChallengeKey(token: string): string {
        return this.twoFactorChallengeKeyPattern.replace(
            '{token}',
            () => token
        );
    }

    /** Stores the challenge under a random token with a TTL; the write is the authority, so a failure throws. */
    async setTwoFactorChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        const challengeToken = this.helperStringService.random(48);
        const key = this.buildTwoFactorChallengeKey(challengeToken);
        await this.redis.set(
            key,
            JSON.stringify(cachePayload),
            'PX',
            this.twoFactorChallengeTtlInMs
        );

        return { challengeToken, expiresInMs: this.twoFactorChallengeTtlInMs };
    }

    async getTwoFactorChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = this.buildTwoFactorChallengeKey(token);
        const raw = await this.redis.get(key);

        return raw === null ? null : JSON.parse(raw);
    }

    /** Claims the challenge with one GETDEL on the cache client, so one caller alone receives it; null when none is stored, and a Redis failure throws RedisUnavailableException. */
    async consumeTwoFactorChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = this.buildTwoFactorChallengeKey(token);
        let claimed: string | null;
        try {
            claimed = await this.redis.getdel(key);
        } catch (error: unknown) {
            this.logger.error(error, 'Two-factor challenge claim failed');

            throw new RedisUnavailableException();
        }

        return claimed === null ? null : JSON.parse(claimed);
    }
}
