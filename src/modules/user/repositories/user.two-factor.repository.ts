import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { Prisma } from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import type { IUserTwoFactorRepository } from '@modules/user/interfaces/user.two-factor-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorRepository implements IUserTwoFactorRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private buildVerifyTwoFactorArgs(
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Prisma.TwoFactorUpdateManyArgs {
        const isBackupCode = method === EnumAuthTwoFactorMethod.backupCodes;
        const lastUsedAt = this.helperDateService.create();

        return {
            where: {
                userId,
                ...(isBackupCode && {
                    backupCodes: { equals: currentBackupCodes },
                }),
            },
            data: {
                lastUsedAt,
                ...(isBackupCode && {
                    backupCodes: newBackupCodes,
                }),
            },
        };
    }

    private buildSetupTwoFactorData(
        pendingSecretEncrypted: string
    ): Prisma.TwoFactorUpdateInput {
        const updatedAt = this.helperDateService.create();

        return {
            pendingSecret: pendingSecretEncrypted,
            attempt: 0,
            updatedAt,
        };
    }

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
        verified: IAuthTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean> {
        const verifyArgs = this.buildVerifyTwoFactorArgs(
            userId,
            verified,
            currentBackupCodes
        );
        const { count } = await tx.twoFactor.updateMany(verifyArgs);

        return count > 0;
    }

    async verifyTwoFactor(
        userId: string,
        verified: IAuthTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean> {
        const verifyArgs = this.buildVerifyTwoFactorArgs(
            userId,
            verified,
            currentBackupCodes
        );
        const { count } =
            await this.databaseService.client.twoFactor.updateMany(verifyArgs);

        return count > 0;
    }

    async setupTwoFactor(
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor> {
        const setupData = this.buildSetupTwoFactorData(pendingSecretEncrypted);

        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: setupData,
        });
    }

    async setupTwoFactorConsumingBackupCode(
        userId: string,
        pendingSecretEncrypted: string,
        verified: IAuthTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean> {
        return this.databaseService.withTransaction(async tx => {
            const verifyArgs = this.buildVerifyTwoFactorArgs(
                userId,
                verified,
                currentBackupCodes
            );
            const { count } = await tx.twoFactor.updateMany(verifyArgs);
            if (count === 0) {
                return false;
            }

            const setupData = this.buildSetupTwoFactorData(
                pendingSecretEncrypted
            );
            await tx.twoFactor.update({
                where: { userId },
                data: setupData,
            });

            return true;
        });
    }

    async enableTwoFactor(
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor> {
        return this.databaseService.withTransaction(async tx => {
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

    async regenerateTwoFactorBackupCodes(
        userId: string,
        backupCodesHashed: string[]
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return this.databaseService.client.twoFactor.update({
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
