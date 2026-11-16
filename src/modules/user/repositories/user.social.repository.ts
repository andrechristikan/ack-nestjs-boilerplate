import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    EnumUserLoginWith,
    UserSocial,
} from '@generated/prisma-client/client';
import type { IUserSocialRepository } from '@modules/user/interfaces/user.social-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserSocialRepository implements IUserSocialRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findOneByProviderAndSubject(
        provider: EnumUserLoginWith,
        subject: string
    ): Promise<UserSocial | null> {
        return this.databaseService.client.userSocial.findUnique({
            where: { provider_subject: { provider, subject } },
        });
    }

    async findOneByUserAndProvider(
        userId: string,
        provider: EnumUserLoginWith
    ): Promise<UserSocial | null> {
        return this.databaseService.client.userSocial.findUnique({
            where: { userId_provider: { userId, provider } },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        provider: EnumUserLoginWith,
        subject: string
    ): Promise<void> {
        await tx.userSocial.create({
            data: { userId, provider, subject },
        });
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        const { count } = await tx.userSocial.deleteMany({
            where: { userId },
        });

        return count;
    }
}
