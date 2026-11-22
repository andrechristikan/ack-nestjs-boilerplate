import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    EnumUserLoginWith,
    UserSocial,
} from '@generated/prisma-client/client';

export interface IUserSocialRepository {
    findOneByProviderAndSubject(
        provider: EnumUserLoginWith,
        subject: string
    ): Promise<UserSocial | null>;
    findOneByUserAndProvider(
        userId: string,
        provider: EnumUserLoginWith
    ): Promise<UserSocial | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        provider: EnumUserLoginWith,
        subject: string,
        createdBy: string
    ): Promise<void>;
    deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number>;
}
