import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { Mfa } from '@generated/prisma-client/client';
import type { IMfaRepository } from '@modules/mfa/interfaces/mfa.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaRepository implements IMfaRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findOneByUserId(userId: string): Promise<Mfa | null> {
        return this.databaseService.client.mfa.findUnique({
            where: { userId },
        });
    }

    async findOneByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<Mfa | null> {
        return tx.mfa.findUnique({ where: { userId } });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<Mfa> {
        return tx.mfa.create({
            data: { userId, backupCodes: [], lockedUntil: null, createdBy },
        });
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfa.deleteMany({ where: { userId } });
    }

    async incrementAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date,
        updatedBy: string
    ): Promise<boolean> {
        const { attempt } = await tx.mfa.update({
            where: { userId },
            data: { attempt: { increment: 1 }, updatedBy },
            select: { attempt: true },
        });
        if (attempt < maxAttempt) {
            return false;
        }

        await tx.mfa.update({
            where: { userId },
            data: { attempt: 0, lockedUntil, updatedBy },
        });

        return true;
    }

    async resetAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string | null
    ): Promise<void> {
        await tx.mfa.updateMany({
            where: { userId },
            data: { attempt: 0, lockedUntil: null, updatedBy },
        });
    }

    async createBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        const { count } = await tx.mfa.updateMany({
            where: { userId, backupCodes: { isEmpty: true } },
            data: { backupCodes: backupCodesHashed },
        });

        return count > 0;
    }

    async regenerateBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        const { count } = await tx.mfa.updateMany({
            where: { userId },
            data: { backupCodes: backupCodesHashed },
        });

        return count > 0;
    }

    async clearBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfa.updateMany({
            where: { userId },
            data: { backupCodes: [] },
        });
    }

    async consumeBackupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        currentBackupCodes: string[],
        remainingBackupCodes: string[],
        updatedBy: string
    ): Promise<boolean> {
        const { count } = await tx.mfa.updateMany({
            where: { userId, backupCodes: { equals: currentBackupCodes } },
            data: { backupCodes: remainingBackupCodes, updatedBy },
        });

        return count > 0;
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfa.updateMany({
            where: { userId },
            data: { backupCodes: [], attempt: 0, lockedUntil: null },
        });
    }
}
