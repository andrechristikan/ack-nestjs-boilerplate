import type { AuthSocialNonce } from '@generated/prisma-client/client';

export interface IAuthSocialNonceRepository {
    create(nonceHash: string, expiredAt: Date): Promise<AuthSocialNonce>;
    consume(nonceHash: string, now: Date): Promise<boolean>;
    deleteExpired(now: Date): Promise<number>;
}
