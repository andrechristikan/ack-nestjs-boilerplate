import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    EnumMfaChallengePurpose,
    MfaChallenge,
} from '@generated/prisma-client/client';
import type { IMfaChallengeCreateData } from '@modules/mfa/interfaces/mfa.interface';

export interface IMfaChallengeRepository {
    create(data: IMfaChallengeCreateData): Promise<void>;
    createInTx(
        tx: IDatabaseTransactionClient,
        data: IMfaChallengeCreateData
    ): Promise<void>;
    findActiveByTokenHash(
        tokenHash: string,
        purpose: EnumMfaChallengePurpose,
        now: Date
    ): Promise<MfaChallenge | null>;
    consumeInTx(
        tx: IDatabaseTransactionClient,
        tokenHash: string,
        purpose: EnumMfaChallengePurpose,
        now: Date,
        updatedBy: string
    ): Promise<boolean>;
}
