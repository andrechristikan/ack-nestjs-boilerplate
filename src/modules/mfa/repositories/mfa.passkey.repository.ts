import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { MfaPasskey } from '@generated/prisma-client/client';
import {
    MfaPasskeyRefSelect,
    MfaPasskeySelect,
} from '@modules/mfa/constants/mfa.constant';
import type {
    IMfaPasskey,
    IMfaPasskeyCreate,
    IMfaPasskeyCredential,
} from '@modules/mfa/interfaces/mfa.interface';
import type { IMfaPasskeyRepository } from '@modules/mfa/interfaces/mfa.passkey-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaPasskeyRepository
    extends DatabaseRepositoryBase
    implements IMfaPasskeyRepository
{
    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async findManyByUserId(userId: string): Promise<IMfaPasskey[]> {
        return this.databaseService.client.mfaPasskey.findMany({
            where: { userId },
            select: MfaPasskeySelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    }

    async findManyForCheckByUserId(userId: string): Promise<MfaPasskey[]> {
        return this.databaseService.client.mfaPasskey.findMany({
            where: { userId },
        });
    }

    async findCredentialsByUserId(
        userId: string
    ): Promise<IMfaPasskeyCredential[]> {
        return this.databaseService.client.mfaPasskey.findMany({
            where: { userId },
            select: MfaPasskeyRefSelect,
        });
    }

    async findOneByCredentialId(
        credentialId: string
    ): Promise<MfaPasskey | null> {
        return this.databaseService.client.mfaPasskey.findUnique({
            where: { credentialId },
        });
    }

    async existsByUserId(userId: string): Promise<boolean> {
        const count = await this.databaseService.client.mfaPasskey.count({
            where: { userId },
        });

        return count > 0;
    }

    async existsByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        const count = await tx.mfaPasskey.count({ where: { userId } });

        return count > 0;
    }

    async countByUserId(userId: string): Promise<number> {
        return this.databaseService.client.mfaPasskey.count({
            where: { userId },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        data: IMfaPasskeyCreate
    ): Promise<IMfaPasskey> {
        return tx.mfaPasskey.create({
            data: { ...data, lastUsedAt: null, createdBy: data.userId },
            select: MfaPasskeySelect,
        });
    }

    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        passkeyId: string,
        counter: number,
        now: Date,
        updatedBy: string
    ): Promise<boolean> {
        const { count } = await tx.mfaPasskey.updateMany({
            where: { id: passkeyId },
            data: { counter, lastUsedAt: now, updatedBy },
        });

        return count > 0;
    }

    async updateNameInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string,
        name: string
    ): Promise<boolean> {
        const { count } = await tx.mfaPasskey.updateMany({
            where: { id: passkeyId, userId },
            data: { name, updatedBy: userId },
        });

        return count > 0;
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfaPasskey.deleteMany({
                where: { id: passkeyId, userId },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfaPasskey.deleteMany({ where: { userId } });
    }
}
