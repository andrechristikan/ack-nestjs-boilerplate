import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { TwoFactor } from '@generated/prisma-client';
import { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';

export interface IUserTwoFactorRepository {
    createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor>;
    verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { method, usedBackupCodeHash }: IAuthTwoFactorVerifyResult
    ): Promise<TwoFactor>;
    setupTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        secretEncrypted: string,
        iv: string
    ): Promise<TwoFactor>;
    enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
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
        userId: string,
        updatedBy: string
    ): Promise<TwoFactor>;
    increaseTwoFactorAttempt(userId: string): Promise<TwoFactor>;
    resetTwoFactorAttempt(userId: string): Promise<TwoFactor>;
}
