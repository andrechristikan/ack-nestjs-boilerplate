import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    EnumMfaChallengePurpose,
    MfaChallenge,
} from '@generated/prisma-client/client';
import type { IMfaChallengeRepository } from '@modules/mfa/interfaces/mfa.challenge-repository.interface';
import type { IMfaChallengeCreateData } from '@modules/mfa/interfaces/mfa.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaChallengeRepository
    extends DatabaseRepositoryBase
    implements IMfaChallengeRepository
{
    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async create(data: IMfaChallengeCreateData): Promise<void> {
        await this.databaseService.client.mfaChallenge.create({
            data: { ...data, createdBy: data.userId, consumedAt: null },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        data: IMfaChallengeCreateData
    ): Promise<void> {
        await tx.mfaChallenge.create({
            data: { ...data, createdBy: data.userId, consumedAt: null },
        });
    }

    async findActiveByTokenHash(
        tokenHash: string,
        purpose: EnumMfaChallengePurpose,
        now: Date
    ): Promise<MfaChallenge | null> {
        return this.databaseService.client.mfaChallenge.findFirst({
            where: {
                tokenHash,
                purpose,
                consumedAt: null,
                expiredAt: { gt: now },
            },
        });
    }

    async consumeInTx(
        tx: IDatabaseTransactionClient,
        tokenHash: string,
        purpose: EnumMfaChallengePurpose,
        now: Date,
        updatedBy: string
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfaChallenge.updateMany({
                where: {
                    tokenHash,
                    purpose,
                    consumedAt: null,
                    expiredAt: { gt: now },
                },
                data: { consumedAt: now, updatedBy },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async deleteExpiredBefore(threshold: Date): Promise<number> {
        const { count } =
            await this.databaseService.client.mfaChallenge.deleteMany({
                where: { expiredAt: { lt: threshold } },
            });

        return count;
    }
}
