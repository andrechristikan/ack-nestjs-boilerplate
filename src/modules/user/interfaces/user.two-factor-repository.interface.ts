import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import type {
    IUserTwoFactorChallengeCreate,
    IUserTwoFactorChallengeRow,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';

export interface IUserTwoFactorRepository {
    createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor>;
    deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verified: IUserTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean>;
    setupTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor>;
    enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<boolean>;
    disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean>;
    regenerateTwoFactorBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean>;
    resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor>;
    markTotpUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number
    ): Promise<boolean>;
    incrementAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date
    ): Promise<boolean>;
    resetTwoFactorAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    createChallengeInTx(
        tx: IDatabaseTransactionClient,
        data: IUserTwoFactorChallengeCreate
    ): Promise<void>;
    findActiveChallengeByTokenHash(
        tokenHash: string,
        now: Date
    ): Promise<IUserTwoFactorChallengeRow | null>;
    consumeChallengeInTx(
        tx: IDatabaseTransactionClient,
        tokenHash: string,
        now: Date,
        updatedBy: string
    ): Promise<boolean>;
}
