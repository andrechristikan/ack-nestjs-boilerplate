import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { Mfa } from '@generated/prisma-client/client';
import { MfaRefSelect } from '@modules/mfa/constants/mfa.constant';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import type { IMfaCreate } from '@modules/mfa/interfaces/mfa.interface';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import type { IMfaRepository } from '@modules/mfa/interfaces/mfa.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaRepository implements IMfaRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

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

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        entries: IMfaCreate[]
    ): Promise<void> {
        await tx.mfa.createMany({
            data: entries.map(({ userId, createdBy }) => ({
                userId,
                backupCodes: [],
                lockedUntil: null,
                createdBy,
            })),
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
            select: MfaRefSelect,
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
        try {
            await tx.mfa.updateMany({
                where: { userId },
                data: { attempt: 0, lockedUntil: null, updatedBy },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new MfaInvalidException()
            );
        }
    }

    async createBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfa.updateMany({
                where: { userId, backupCodes: { isEmpty: true } },
                data: { backupCodes: backupCodesHashed },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new MfaInvalidException()
            );
        }
    }

    async regenerateBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfa.updateMany({
                where: { userId },
                data: { backupCodes: backupCodesHashed },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new MfaNotEnabledException()
            );
        }
    }

    async clearBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        try {
            await tx.mfa.updateMany({
                where: { userId },
                data: { backupCodes: [] },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new MfaInvalidException()
            );
        }
    }

    async consumeBackupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        currentBackupCodes: string[],
        remainingBackupCodes: string[],
        updatedBy: string
    ): Promise<boolean> {
        try {
            const { count } = await tx.mfa.updateMany({
                where: { userId, backupCodes: { equals: currentBackupCodes } },
                data: { backupCodes: remainingBackupCodes, updatedBy },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new MfaInvalidException()
            );
        }
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
