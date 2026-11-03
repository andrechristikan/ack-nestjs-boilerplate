import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';

/** 2FA domain service: the login challenge a token stands for. */
@Injectable()
export class AuthTwoFactorDomain {
    constructor(private readonly authCache: AuthCache) {}

    /** Stores the login challenge under a random token. */
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

    /** Claims the challenge of a token; one caller receives it, any later caller finds none and fails. */
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
