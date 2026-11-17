import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { MfaPasskey } from '@generated/prisma-client/client';
import type {
    IMfaPasskey,
    IMfaPasskeyCreate,
    IMfaPasskeyCredential,
} from '@modules/mfa/interfaces/mfa.interface';

export interface IMfaPasskeyRepository {
    findManyByUserId(userId: string): Promise<IMfaPasskey[]>;
    findCredentialsByUserId(userId: string): Promise<IMfaPasskeyCredential[]>;
    findOneByCredentialId(credentialId: string): Promise<MfaPasskey | null>;
    existsByUserId(userId: string): Promise<boolean>;
    existsByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean>;
    countByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number>;
    existsByCredentialIdInTx(
        tx: IDatabaseTransactionClient,
        credentialId: string
    ): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        data: IMfaPasskeyCreate
    ): Promise<IMfaPasskey>;
    markUsedInTx(
        tx: IDatabaseTransactionClient,
        passkeyId: string,
        counter: number,
        now: Date,
        updatedBy: string
    ): Promise<boolean>;
    updateNameInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string,
        name: string
    ): Promise<boolean>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string
    ): Promise<boolean>;
    deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
