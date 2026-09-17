import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { ForgotPassword } from '@generated/prisma-client/client';
import type {
    IUser,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';

export interface IUserPasswordRepository {
    findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<(ForgotPassword & { user: IUser }) | null>;
    findOneLatestByForgotPassword(
        userId: string
    ): Promise<ForgotPassword | null>;
    expireUnusedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string,
        { expiredAt, reference, hashedToken }: IUserForgotPasswordCreate
    ): Promise<ForgotPassword>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        resetAt: Date
    ): Promise<ForgotPassword>;
}
