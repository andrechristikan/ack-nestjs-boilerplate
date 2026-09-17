import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import type { IUserTwoFactorRepository } from '@modules/user/interfaces/user.two-factor.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorRepository implements IUserTwoFactorRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor> {
        return tx.twoFactor.create({
            data: {
                userId,
                enabled: false,
                requiredSetup: false,
                createdBy,
            },
        });
    }

    /** Records a verified two-factor use; a backup-code result is written only while the stored codes still equal `currentBackupCodes`, and `false` means nothing was written. */
    async verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean> {
        const isBackupCode = method === EnumAuthTwoFactorMethod.backupCodes;
        const { count } = await tx.twoFactor.updateMany({
            where: {
                userId,
                ...(isBackupCode && {
                    backupCodes: { equals: currentBackupCodes },
                }),
            },
            data: {
                lastUsedAt: this.helperDateService.create(),
                ...(isBackupCode && {
                    backupCodes: newBackupCodes,
                }),
            },
        });

        return count > 0;
    }

    async setupTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                pendingSecret: pendingSecretEncrypted,
                attempt: 0,
                updatedAt: now,
            },
        });
    }

    async enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();
        const twoFactor = await tx.twoFactor.findUnique({
            where: { userId },
            select: {
                confirmedAt: true,
            },
        });

        return tx.twoFactor.update({
            where: { userId },
            data: {
                secret: secretEncrypted,
                pendingSecret: null,
                enabled: true,
                requiredSetup: false,
                confirmedAt: twoFactor?.confirmedAt ?? now,
                backupCodes: backupCodesHashed,
                lastUsedAt: now,
                updatedAt: now,
                updatedBy: userId,
            },
        });
    }

    async disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                enabled: false,
                requiredSetup: false,
                backupCodes: [],
                lastUsedAt: now,
                secret: null,
                pendingSecret: null,
                updatedAt: now,
            },
        });
    }

    async regenerateTwoFactorBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                backupCodes: backupCodesHashed,
                updatedAt: now,
            },
        });
    }

    async resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                requiredSetup: true,
                attempt: 0,
                backupCodes: [],
                secret: null,
                pendingSecret: null,
                updatedAt: now,
            },
        });
    }

    async increaseTwoFactorAttempt(userId: string): Promise<TwoFactor> {
        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: {
                attempt: {
                    increment: 1,
                },
            },
        });
    }

    async resetTwoFactorAttempt(userId: string): Promise<TwoFactor> {
        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: {
                attempt: 0,
            },
        });
    }
}
