import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { Prisma } from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type {
    IUserTwoFactorChallengeCreate,
    IUserTwoFactorChallengeRow,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
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
        { method, newBackupCodes }: IUserTwoFactorVerifyResult,
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
                ...(newBackupCodes !== null && {
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

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.twoFactor.deleteMany({
            where: { userId },
        });
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

    async verifyTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verified: IUserTwoFactorVerifyResult,
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

    async setupTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string
    ): Promise<TwoFactor> {
        const setupData = this.buildSetupTwoFactorData(pendingSecretEncrypted);

        return tx.twoFactor.update({
            where: { userId },
            data: setupData,
        });
    }

    async setupTwoFactorConsumingBackupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        pendingSecretEncrypted: string,
        verified: IUserTwoFactorVerifyResult,
        currentBackupCodes: string[]
    ): Promise<boolean> {
        const verifyArgs = this.buildVerifyTwoFactorArgs(
            userId,
            verified,
            currentBackupCodes
        );
        const { count } = await tx.twoFactor.updateMany(verifyArgs);
        if (count === 0) {
            return false;
        }

        const setupData = this.buildSetupTwoFactorData(pendingSecretEncrypted);
        await tx.twoFactor.update({
            where: { userId },
            data: setupData,
        });

        return true;
    }

    async enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        secretEncrypted: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const twoFactor = await tx.twoFactor.findUnique({
            where: { userId },
            select: {
                confirmedAt: true,
            },
        });

        const { count } = await tx.twoFactor.updateMany({
            where: { userId, pendingSecret: secretEncrypted },
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

        return count > 0;
    }

    async disableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const { count } = await tx.twoFactor.updateMany({
            where: { userId, enabled: true },
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

        return count > 0;
    }

    async regenerateTwoFactorBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        backupCodesHashed: string[]
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const { count } = await tx.twoFactor.updateMany({
            where: { userId, enabled: true },
            data: {
                backupCodes: backupCodesHashed,
                updatedAt: now,
            },
        });

        return count > 0;
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
                lockedUntil: null,
                backupCodes: [],
                secret: null,
                pendingSecret: null,
                updatedAt: now,
            },
        });
    }

    async markTotpUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number
    ): Promise<boolean> {
        const { count } = await tx.twoFactor.updateMany({
            where: {
                userId,
                OR: [
                    { lastUsedStep: { isSet: false } },
                    { lastUsedStep: null },
                    { lastUsedStep: { lt: step } },
                ],
            },
            data: { lastUsedStep: step },
        });

        return count > 0;
    }

    async incrementAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date
    ): Promise<boolean> {
        const { attempt } = await tx.twoFactor.update({
            where: { userId },
            data: { attempt: { increment: 1 } },
            select: { attempt: true },
        });
        if (attempt < maxAttempt) {
            return false;
        }

        await tx.twoFactor.update({
            where: { userId },
            data: { attempt: 0, lockedUntil },
        });

        return true;
    }

    async resetTwoFactorAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.twoFactor.updateMany({
            where: { userId },
            data: { attempt: 0, lockedUntil: null },
        });
    }

    async createChallengeInTx(
        tx: IDatabaseTransactionClient,
        data: IUserTwoFactorChallengeCreate
    ): Promise<void> {
        await tx.twoFactorChallenge.create({
            data: { ...data, createdBy: data.userId, consumedAt: null },
        });
    }

    async findActiveChallengeByTokenHash(
        tokenHash: string,
        now: Date
    ): Promise<IUserTwoFactorChallengeRow | null> {
        return this.databaseService.client.twoFactorChallenge.findFirst({
            where: { tokenHash, consumedAt: null, expiredAt: { gt: now } },
        });
    }

    async consumeChallengeInTx(
        tx: IDatabaseTransactionClient,
        tokenHash: string,
        now: Date
    ): Promise<boolean> {
        const { count } = await tx.twoFactorChallenge.updateMany({
            where: { tokenHash, consumedAt: null, expiredAt: { gt: now } },
            data: { consumedAt: now },
        });

        return count > 0;
    }
}
