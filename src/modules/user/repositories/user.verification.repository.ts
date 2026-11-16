import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    EnumUserReauthenticationAction,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import type { IUserVerificationRepository } from '@modules/user/interfaces/user.verification-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationRepository implements IUserVerificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async findOneActiveByVerificationEmailToken(
        token: string
    ): Promise<Verification | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.verification.findFirst({
            where: {
                token,
                isUsed: false,
                type: EnumVerificationType.email,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
        });
    }

    async findOneLatestByVerificationEmail(
        userId: string
    ): Promise<Verification | null> {
        return this.databaseService.client.verification.findFirst({
            where: {
                userId,
                type: EnumVerificationType.email,
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneLatestReauthentication(
        userId: string,
        action: EnumUserReauthenticationAction
    ): Promise<Verification | null> {
        return this.databaseService.client.verification.findFirst({
            where: {
                userId,
                type: EnumVerificationType.reauthentication,
                action,
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneActiveReauthentication(
        userId: string,
        action: EnumUserReauthenticationAction,
        token: string
    ): Promise<Verification | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.verification.findFirst({
            where: {
                userId,
                type: EnumVerificationType.reauthentication,
                action,
                token,
                isUsed: false,
                expiredAt: {
                    gt: today,
                },
            },
        });
    }

    async markUnusedReauthenticationUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        action: EnumUserReauthenticationAction
    ): Promise<void> {
        await tx.verification.updateMany({
            where: {
                userId,
                type: EnumVerificationType.reauthentication,
                action,
                isUsed: false,
            },
            data: {
                isUsed: true,
                updatedBy: userId,
            },
        });
    }

    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date,
        updatedBy: string
    ): Promise<boolean> {
        const { count } = await tx.verification.updateMany({
            where: { id, isUsed: false, expiredAt: { gt: verifiedAt } },
            data: {
                isUsed: true,
                verifiedAt,
                updatedBy,
            },
        });

        return count > 0;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        {
            reference,
            token,
            type,
            action,
            to,
            expiredAt,
            verifiedAt,
            isUsed,
        }: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification> {
        return tx.verification.create({
            data: {
                userId,
                reference,
                token,
                type,
                action,
                to,
                expiredAt,
                verifiedAt,
                isUsed,
                createdBy,
            },
        });
    }

    async createReplacingActiveInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        userEmail: string,
        {
            expiredAt,
            reference,
            hashedToken,
            type,
        }: IUserVerificationEmailCreate,
        createdAt: Date
    ): Promise<Verification> {
        await tx.verification.updateMany({
            where: {
                userId,
                type,
                isUsed: false,
                expiredAt: {
                    gt: createdAt,
                },
            },
            data: {
                expiredAt: createdAt,
                updatedBy: userId,
            },
        });

        return tx.verification.create({
            data: {
                userId,
                expiredAt,
                reference,
                token: hashedToken,
                type,
                action: null,
                to: userEmail,
                createdBy: userId,
                createdAt,
            },
        });
    }
}
