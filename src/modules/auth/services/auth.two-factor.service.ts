import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthTwoFactorService {
    constructor(private readonly authCache: AuthCache) {}

    async createChallenge(
        payload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        return this.authCache.setTwoFactorChallenge(payload);
    }

    async getChallenge(token: string): Promise<IAuthTwoFactorChallengeCache> {
        const challenge = await this.authCache.getTwoFactorChallenge(token);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        return challenge;
    }

    /** Claims the challenge of a token once; an unknown or already claimed token throws the invalid-challenge exception, a store failure throws RedisUnavailableException. */
    async consumeChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache> {
        const challenge = await this.authCache.consumeTwoFactorChallenge(token);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        return challenge;
    }
}
