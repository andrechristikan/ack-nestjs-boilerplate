import { Prisma } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    EnumMfaChallengePurpose,
    MfaChallenge,
} from '@generated/prisma-client/client';
import type { IMfaChallengeRepository } from '@modules/mfa/interfaces/mfa.challenge-repository.interface';
import type { IMfaChallengeCreateData } from '@modules/mfa/interfaces/mfa.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaChallengeRepository implements IMfaChallengeRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    private toCreateInput(
        data: IMfaChallengeCreateData
    ): Prisma.MfaChallengeUncheckedCreateInput {
        const { device, ...rest } = data;

        return {
            ...rest,
            device:
                device === null
                    ? Prisma.DbNull
                    : (device as unknown as Prisma.InputJsonObject),
            createdBy: data.userId,
            consumedAt: null,
        };
    }

    async create(data: IMfaChallengeCreateData): Promise<void> {
        const input = this.toCreateInput(data);

        await this.databaseService.client.mfaChallenge.create({
            data: input,
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        data: IMfaChallengeCreateData
    ): Promise<void> {
        const input = this.toCreateInput(data);

        await tx.mfaChallenge.create({
            data: input,
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
    }

    async deleteExpiredBefore(threshold: Date): Promise<number> {
        const { count } =
            await this.databaseService.client.mfaChallenge.deleteMany({
                where: { expiredAt: { lt: threshold } },
            });

        return count;
    }
}
