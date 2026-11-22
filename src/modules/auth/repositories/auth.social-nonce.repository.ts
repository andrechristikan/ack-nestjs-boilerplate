import { DatabaseService } from '@common/database/services/database.service';
import type { AuthSocialNonce } from '@generated/prisma-client/client';
import type { IAuthSocialNonceRepository } from '@modules/auth/interfaces/auth.social-nonce-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthSocialNonceRepository implements IAuthSocialNonceRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async create(nonceHash: string, expiredAt: Date): Promise<AuthSocialNonce> {
        return this.databaseService.client.authSocialNonce.create({
            data: { nonceHash, expiredAt },
        });
    }

    async consume(nonceHash: string, now: Date): Promise<boolean> {
        const { count } =
            await this.databaseService.client.authSocialNonce.deleteMany({
                where: { nonceHash, expiredAt: { gte: now } },
            });

        return count > 0;
    }

    async deleteExpired(now: Date): Promise<number> {
        const { count } =
            await this.databaseService.client.authSocialNonce.deleteMany({
                where: { expiredAt: { lt: now } },
            });

        return count;
    }
}
