import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    EnumUserReauthenticationAction,
    Verification,
} from '@generated/prisma-client/client';
import type {
    IUserVerificationEmailCreate,
    IUserVerificationWithUser,
} from '@modules/user/interfaces/user.interface';
import type {
    IUserCreateVerification,
    IUserCreateVerificationEntry,
} from '@modules/user/interfaces/user.create.interface';

export interface IUserVerificationRepository {
    findOneActiveByVerificationEmailToken(
        token: string
    ): Promise<IUserVerificationWithUser | null>;
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
    findOneLatestByMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<Verification | null>;
    findOneActiveByMobileOtp(
        userId: string,
        mobileNumberId: string,
        token: string
    ): Promise<Verification | null>;
    findOneActiveMobileById(
        verificationId: string
    ): Promise<Verification | null>;
    markUnusedMobileUsedInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<void>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date,
        updatedBy: string
    ): Promise<Verification>;
    markReauthenticationUsedInTx(
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
            mobileNumberId,
            to,
            expiredAt,
            verifiedAt,
            isUsed,
        }: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification>;
    createManyInTx(
        tx: IDatabaseTransactionClient,
        entries: IUserCreateVerificationEntry[]
    ): Promise<void>;
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
    deleteExpiredBefore(threshold: Date): Promise<number>;
}
