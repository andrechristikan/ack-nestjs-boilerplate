import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumVerificationType } from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import type {
    IUserOnboardingVerificationRow,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';

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
    ): Promise<Verification>;
    expireActiveByTypeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        type: EnumVerificationType,
        expiredAt: Date
    ): Promise<void>;
    createFromOnboardingInTx(
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
        }: IUserOnboardingVerificationRow,
        createdBy: string
    ): Promise<Verification>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        userEmail: string,
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        createdAt: Date
    ): Promise<Verification>;
}
