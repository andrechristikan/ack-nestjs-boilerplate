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
        verified: IAuthTwoFactorVerifyResult
    ): Promise<boolean>;
    verifyTwoFactor(
        userId: string,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<boolean>;
    setupTwoFactor(
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor>;
    setupTwoFactorConsumingBackupCode(
        userId: string,
        pendingSecretEncrypted: string,
        verified: IAuthTwoFactorVerifyResult
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
    increaseTwoFactorAttempt(userId: string): Promise<TwoFactor>;
    resetTwoFactorAttempt(userId: string): Promise<TwoFactor>;
}
