import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Auth cache: two-factor challenge tokens. */
@Injectable()
export class AuthCache {
    private readonly logger = new Logger(AuthCache.name);
    private readonly twoFactorChallengeKeyPattern: string;
    private readonly twoFactorChallengeTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
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
}
