import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Verification } from '@generated/prisma-client/client';
import type { IUserVerificationCreate } from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';

export interface IUserVerificationRepository {
    findOneActiveByVerificationEmailToken(
        token: string
    ): Promise<Verification | null>;
    findOneLatestByVerificationEmail(
        userId: string
    ): Promise<Verification | null>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date
    ): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        {
            reference,
            token,
            type,
            to,
            expiredAt,
            verifiedAt,
            isUsed,
        }: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification>;
    createReplacingActive(
        userId: string,
        userEmail: string,
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        createdAt: Date
    ): Promise<Verification>;
}
