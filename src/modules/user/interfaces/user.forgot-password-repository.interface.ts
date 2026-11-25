import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { ForgotPassword } from '@generated/prisma-client/client';
import type {
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';

export interface IUserForgotPasswordRepository {
    findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<IUserForgotPassword | null>;
    findOneLatestByForgotPassword(
        userId: string
    ): Promise<ForgotPassword | null>;
    createReplacingUnusedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string,
        { expiredAt, reference, hashedToken }: IUserForgotPasswordCreate
    ): Promise<ForgotPassword>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        resetAt: Date,
        updatedBy: string
    ): Promise<ForgotPassword>;
    markUnusedUsedByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void>;
    deleteExpiredBefore(threshold: Date): Promise<number>;
}
