import {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IAuthCacheService {
    createChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge>;
    getChallenge(token: string): Promise<IAuthTwoFactorChallengeCache | null>;
    clearChallenge(token: string): Promise<void>;
    lockTwoFactorAttempt(user: IUser): Promise<void>;
    getLockTwoFactorAttempt(user: IUser): Promise<number>;
    clearLockTwoFactorAttempt(user: IUser): Promise<void>;
}
