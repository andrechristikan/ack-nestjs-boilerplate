import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { MfaInclude } from '@modules/mfa/constants/mfa.constant';
import type { IMfa } from '@modules/mfa/interfaces/mfa.interface';
import type { IMfaRepository } from '@modules/mfa/interfaces/mfa.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaRepository implements IMfaRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findOneByUserId(userId: string): Promise<IMfa | null> {
        return this.databaseService.client.mfa.findUnique({
            where: { userId },
            include: MfaInclude,
        });
    }

    async findOneByUserIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<IMfa | null> {
        return tx.mfa.findUnique({ where: { userId }, include: MfaInclude });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<IMfa> {
        return tx.mfa.create({
            data: { userId, lockedUntil: null, createdBy },
            include: MfaInclude,
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
        const mfa = await tx.mfa.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (mfa === null) {
            return false;
        }

        const { count } = await tx.mfaBackupCode.createMany({
            data: backupCodesHashed.map(codeHash => ({
                mfaId: mfa.id,
                codeHash,
            })),
        });

        return count > 0;
    }

    async regenerateBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        const mfa = await tx.mfa.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (mfa === null) {
            return false;
        }

        await tx.mfaBackupCode.deleteMany({ where: { mfaId: mfa.id } });
        await tx.mfaBackupCode.createMany({
            data: backupCodesHashed.map(codeHash => ({
                mfaId: mfa.id,
                codeHash,
            })),
        });

        return true;
    }

    async clearBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfaBackupCode.deleteMany({ where: { mfa: { userId } } });
    }

    async consumeBackupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodeHash: string,
        usedAt: Date
    ): Promise<boolean> {
        const { count } = await tx.mfaBackupCode.updateMany({
            where: { codeHash: backupCodeHash, usedAt: null, mfa: { userId } },
            data: { usedAt },
        });

        return count > 0;
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.mfaBackupCode.deleteMany({ where: { mfa: { userId } } });
        await tx.mfa.updateMany({
            where: { userId },
            data: { attempt: 0, lockedUntil: null },
        });
    }
}
