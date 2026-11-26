import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { MfaTotp } from '@generated/prisma-client/client';
import type { IMfaTotpRepository } from '@modules/mfa/interfaces/mfa.totp-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaTotpRepository
    extends DatabaseRepositoryBase
    implements IMfaTotpRepository
{
    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

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
        try {
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
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async enableInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string,
        step: number,
        now: Date
    ): Promise<boolean> {
        try {
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
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfaTotp.deleteMany({
                where: { userId, secret: { not: null } },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
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
        try {
            const { count } = await tx.mfaTotp.updateMany({
                where: {
                    userId,
                    OR: [
                        { lastUsedStep: null },
                        { lastUsedStep: { lt: step } },
                    ],
                },
                data: { lastUsedStep: step, lastUsedAt: now, updatedBy },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }
}
