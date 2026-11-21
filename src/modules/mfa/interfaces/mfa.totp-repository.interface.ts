import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { MfaTotp } from '@generated/prisma-client/client';

export interface IMfaTotpRepository {
    findOneByUserId(userId: string): Promise<MfaTotp | null>;
    existsConfirmed(userId: string): Promise<boolean>;
    existsConfirmedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean>;
    setupInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<void>;
    enableInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string,
        step: number,
        now: Date
    ): Promise<boolean>;
    disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean>;
    deleteInTx(tx: IDatabaseTransactionClient, userId: string): Promise<void>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number,
        now: Date,
        updatedBy: string
    ): Promise<boolean>;
}
