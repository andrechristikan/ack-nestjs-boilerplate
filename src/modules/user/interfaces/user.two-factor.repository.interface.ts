import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';

export interface IUserTwoFactorRepository {
    createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor>;
    verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
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
    ): Promise<TwoFactor>;
    disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor>;
    regenerateTwoFactorBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor>;
    resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor>;
    increaseTwoFactorAttempt(userId: string): Promise<TwoFactor>;
    resetTwoFactorAttempt(userId: string): Promise<TwoFactor>;
}
