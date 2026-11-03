import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IUserTwoFactorVerifyResult } from '@modules/user/interfaces/user.interface';

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
    verifyTwoFactor(
        userId: string,
        verified: IUserTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean>;
    setupTwoFactor(
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor>;
    setupTwoFactorConsumingBackupCode(
        userId: string,
        pendingSecretEncrypted: string,
        verified: IUserTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean>;
    enableTwoFactor(
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor>;
    disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor>;
    regenerateTwoFactorBackupCodes(
        userId: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor>;
    resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor>;
    markTotpUsed(userId: string, step: number): Promise<boolean>;
    incrementAttempt(
        userId: string,
        maxAttempt: number
    ): Promise<number | null>;
    resetTwoFactorAttempt(userId: string): Promise<TwoFactor>;
}
