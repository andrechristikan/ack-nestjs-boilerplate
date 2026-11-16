import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    ITermPolicyRecipientCreate,
    ITermPolicyRecipientState,
} from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyRecipientRepository {
    findManyByUserIds(
        termPolicyId: string,
        userIds: string[]
    ): Promise<ITermPolicyRecipientState[]>;
    findManySendableByBatchIds(
        termPolicyId: string,
        batchIds: string[]
    ): Promise<ITermPolicyRecipientState[]>;
    createManyInTx(
        tx: IDatabaseTransactionClient,
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        recipients: ITermPolicyRecipientCreate[]
    ): Promise<void>;
    claim(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        claimNonce: string,
        claimedAt: Date,
        updatedBy: string
    ): Promise<string[]>;
    markSentInTx(
        tx: IDatabaseTransactionClient,
        claimNonce: string,
        userIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void>;
    release(
        claimNonce: string,
        userIds: string[],
        updatedBy: string
    ): Promise<void>;
}
