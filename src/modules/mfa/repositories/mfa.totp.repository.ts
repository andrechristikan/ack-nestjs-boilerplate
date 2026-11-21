import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { MfaTotp } from '@generated/prisma-client/client';
import type { IMfaTotpRepository } from '@modules/mfa/interfaces/mfa.totp-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaTotpRepository implements IMfaTotpRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findOneByUserId(userId: string): Promise<MfaTotp | null> {
        return this.databaseService.client.mfaTotp.findUnique({
            where: { userId },
        });
    }

    async existsConfirmed(userId: string): Promise<boolean> {
        const count = await this.databaseService.client.mfaTotp.count({
            where: { userId, secret: { not: null } },
        });

        return count > 0;
    }

    async existsConfirmedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        const count = await tx.mfaTotp.count({
            where: { userId, secret: { not: null } },
        });

        return count > 0;
    }

    async setupInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<void> {
        await tx.mfaTotp.upsert({
            where: { userId, secret: null },
            create: {
                userId,
                secret: null,
                pendingSecret: pendingSecretEncrypted,
                confirmedAt: null,
                lastUsedAt: null,
                lastUsedStep: null,
                createdBy: userId,
            },
            update: { pendingSecret: pendingSecretEncrypted },
        });
    }

    async enableInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string,
        step: number,
        now: Date
    ): Promise<boolean> {
        const { count } = await tx.mfaTotp.updateMany({
            where: { userId, pendingSecret: pendingSecretEncrypted },
            data: {
                secret: pendingSecretEncrypted,
                pendingSecret: null,
                confirmedAt: now,
                lastUsedAt: now,
                lastUsedStep: step,
                updatedBy: userId,
            },
        });

        return count > 0;
    }

    async disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        const { count } = await tx.mfaTotp.deleteMany({
            where: { userId, secret: { not: null } },
        });

        return count > 0;
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfaTotp.deleteMany({ where: { userId } });
    }

    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number,
        now: Date,
        updatedBy: string
    ): Promise<boolean> {
        const { count } = await tx.mfaTotp.updateMany({
            where: {
                userId,
                OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }],
            },
            data: { lastUsedStep: step, lastUsedAt: now, updatedBy },
        });

        return count > 0;
    }
}
