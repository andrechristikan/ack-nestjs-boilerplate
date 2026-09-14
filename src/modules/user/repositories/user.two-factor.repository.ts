import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { TwoFactor } from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { IUserTwoFactorRepository } from '@modules/user/interfaces/user.two-factor.repository.interface';
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

    async verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult
    ): Promise<TwoFactor> {
        return tx.twoFactor.update({
            where: { userId },
            data: {
                lastUsedAt: this.helperDateService.create(),
                ...(method === EnumAuthTwoFactorMethod.backupCodes && {
                    backupCodes: newBackupCodes,
                }),
            },
        });
    }

    async setupTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        secretEncrypted: string,
        iv: string
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                secret: secretEncrypted,
                iv,
                attempt: 0,
                updatedAt: now,
                updatedBy: userId,
            },
        });
    }

    async enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
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
                iv: null,
                updatedBy: userId,
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
                updatedBy: userId,
                updatedAt: now,
            },
        });
    }

    async resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<TwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                requiredSetup: true,
                attempt: 0,
                backupCodes: [],
                secret: null,
                iv: null,
                updatedBy,
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
