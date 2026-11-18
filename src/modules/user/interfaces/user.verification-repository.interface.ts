import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Verification } from '@generated/prisma-client/client';
import type {
    IUserMobileNumberVerificationCreate,
    IUserOnboardingVerification,
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
        }: IUserOnboardingVerification,
        createdBy: string
    ): Promise<Verification>;
    createReplacingActive(
        userId: string,
        userEmail: string,
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        createdAt: Date
    ): Promise<Verification>;
    findOneLatestMobileNumberByUser(
        userId: string
    ): Promise<Verification | null>;
    findOneActiveMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<Verification | null>;
    markUsedActiveMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date
    ): Promise<boolean>;
    expireActiveMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string,
        expiredAt: Date
    ): Promise<void>;
    createMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string,
        to: string,
        {
            hashedOtp,
            reference,
            expiredAt,
        }: Pick<
            IUserMobileNumberVerificationCreate,
            'hashedOtp' | 'reference' | 'expiredAt'
        >,
        createdAt: Date
    ): Promise<Verification>;
}
