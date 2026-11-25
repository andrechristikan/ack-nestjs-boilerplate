import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Mfa } from '@generated/prisma-client/client';
import type { IMfaCreate } from '@modules/mfa/interfaces/mfa.interface';

export interface IMfaRepository {
    findOneByUserId(userId: string): Promise<Mfa | null>;
    findOneByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<Mfa | null>;
    createManyInTx(
        tx: IDatabaseTransactionClient,
        entries: IMfaCreate[]
    ): Promise<void>;
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
        currentBackupCodes: string[],
        remainingBackupCodes: string[],
        updatedBy: string
    ): Promise<boolean>;
    resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
