import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IMfa } from '@modules/mfa/interfaces/mfa.interface';

export interface IMfaRepository {
    findOneByUserId(userId: string): Promise<IMfa | null>;
    findOneByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<IMfa | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<IMfa>;
    deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    incrementAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date,
        updatedBy: string
    ): Promise<boolean>;
    resetAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string | null
    ): Promise<void>;
    createBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean>;
    regenerateBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean>;
    clearBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    consumeBackupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodeHash: string,
        usedAt: Date
    ): Promise<boolean>;
    resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
