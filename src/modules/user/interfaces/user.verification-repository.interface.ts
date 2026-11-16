import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    EnumUserReauthenticationAction,
    Verification,
} from '@generated/prisma-client/client';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';

export interface IUserVerificationRepository {
    findOneActiveByVerificationEmailToken(
        token: string
    ): Promise<Verification | null>;
    findOneLatestByVerificationEmail(
        userId: string
    ): Promise<Verification | null>;
    findOneLatestReauthentication(
        userId: string,
        action: EnumUserReauthenticationAction
    ): Promise<Verification | null>;
    findOneActiveReauthentication(
        userId: string,
        action: EnumUserReauthenticationAction,
        token: string
    ): Promise<Verification | null>;
    markUnusedReauthenticationUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        action: EnumUserReauthenticationAction
    ): Promise<void>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date,
        updatedBy: string
    ): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        {
            reference,
            token,
            type,
            action,
            to,
            expiredAt,
            verifiedAt,
            isUsed,
        }: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification>;
    createReplacingActiveInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        userEmail: string,
        {
            expiredAt,
            reference,
            hashedToken,
            type,
        }: IUserVerificationEmailCreate,
        createdAt: Date
    ): Promise<Verification>;
}
