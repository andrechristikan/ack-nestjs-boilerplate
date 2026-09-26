import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { TwoFactorWithBackupCodesInclude } from '@modules/user/constants/user.constant';
import type { IUserTwoFactor } from '@modules/user/interfaces/user.interface';
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

    private async recordVerificationInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { method, usedBackupCodeHash }: IAuthTwoFactorVerifyResult
    ): Promise<boolean> {
        const lastUsedAt = this.helperDateService.create();

        if (method === EnumAuthTwoFactorMethod.backupCodes) {
            if (!usedBackupCodeHash) {
                return false;
            }

            const { count } = await tx.twoFactorBackupCode.updateMany({
                where: {
                    twoFactor: { userId },
                    codeHash: usedBackupCodeHash,
                    usedAt: null,
                },
                data: { usedAt: lastUsedAt },
            });
            if (count === 0) {
                return false;
            }
        }

        await tx.twoFactor.update({
            where: { userId },
            data: { lastUsedAt },
        });

        return true;
    }

    async createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<IUserTwoFactor> {
        return tx.twoFactor.create({
            data: {
                userId,
                enabled: false,
                requiredSetup: false,
                createdBy,
            },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<boolean> {
        return this.recordVerificationInTx(tx, userId, verified);
    }

    async verifyTwoFactor(
        userId: string,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<boolean> {
        return this.databaseService.withTransaction(tx =>
            this.recordVerificationInTx(tx, userId, verified)
        );
    }

    async setupTwoFactor(
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<IUserTwoFactor> {
        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: {
                pendingSecret: pendingSecretEncrypted,
                attempt: 0,
            },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async setupTwoFactorConsumingBackupCode(
        userId: string,
        pendingSecretEncrypted: string,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<boolean> {
        return this.databaseService.withTransaction(async tx => {
            const recorded = await this.recordVerificationInTx(
                tx,
                userId,
                verified
            );
            if (!recorded) {
                return false;
            }

            await tx.twoFactor.update({
                where: { userId },
                data: {
                    pendingSecret: pendingSecretEncrypted,
                    attempt: 0,
                },
            });

            return true;
        });
    }

    async enableTwoFactor(
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<IUserTwoFactor> {
        return this.databaseService.withTransaction(async tx => {
            const now = this.helperDateService.create();
            const twoFactor = await tx.twoFactor.findUnique({
                where: { userId },
                select: { confirmedAt: true },
            });

            return tx.twoFactor.update({
                where: { userId },
                data: {
                    secret: secretEncrypted,
                    pendingSecret: null,
                    enabled: true,
                    requiredSetup: false,
                    confirmedAt: twoFactor?.confirmedAt ?? now,
                    backupCodes: {
                        deleteMany: {},
                        createMany: {
                            data: backupCodesHashed.map(codeHash => ({
                                codeHash,
                            })),
                        },
                    },
                    lastUsedAt: now,
                    updatedAt: now,
                    updatedBy: userId,
                },
                include: TwoFactorWithBackupCodesInclude,
            });
        });
    }

    async disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<IUserTwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                enabled: false,
                requiredSetup: false,
                backupCodes: { deleteMany: {} },
                lastUsedAt: now,
                secret: null,
                pendingSecret: null,
                updatedBy: userId,
                updatedAt: now,
            },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async regenerateTwoFactorBackupCodes(
        userId: string,
        backupCodesHashed: string[]
    ): Promise<IUserTwoFactor> {
        const now = this.helperDateService.create();

        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: {
                backupCodes: {
                    deleteMany: {},
                    createMany: {
                        data: backupCodesHashed.map(codeHash => ({ codeHash })),
                    },
                },
                updatedBy: userId,
                updatedAt: now,
            },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async resetTwoFactorByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<IUserTwoFactor> {
        const now = this.helperDateService.create();

        return tx.twoFactor.update({
            where: { userId },
            data: {
                requiredSetup: true,
                attempt: 0,
                backupCodes: { deleteMany: {} },
                secret: null,
                pendingSecret: null,
                updatedAt: now,
            },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async increaseTwoFactorAttempt(userId: string): Promise<IUserTwoFactor> {
        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: { attempt: { increment: 1 } },
            include: TwoFactorWithBackupCodesInclude,
        });
    }

    async resetTwoFactorAttempt(userId: string): Promise<IUserTwoFactor> {
        return this.databaseService.client.twoFactor.update({
            where: { userId },
            data: { attempt: 0 },
            include: TwoFactorWithBackupCodesInclude,
        });
    }
}
