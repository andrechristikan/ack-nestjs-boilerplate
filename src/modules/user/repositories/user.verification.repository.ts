import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import type {
    IUserOnboardingVerification,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
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

    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        verifiedAt: Date
    ): Promise<Verification> {
        return tx.verification.update({
            where: { id },
            data: {
                isUsed: true,
                verifiedAt,
            },
        });
    }

    async createFromOnboardingInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        {
            reference,
            token,
            type,
            to,
            expiredAt,
            verifiedAt,
            isUsed,
        }: IUserOnboardingVerification,
        createdBy: string
    ): Promise<Verification> {
        return tx.verification.create({
            data: {
                userId,
                reference,
                token,
                type,
                to,
                expiredAt,
                verifiedAt,
                isUsed,
                createdBy,
            },
        });
    }

    async createReplacingActive(
        userId: string,
        userEmail: string,
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        createdAt: Date
    ): Promise<Verification> {
        return this.databaseService.withTransaction(async tx => {
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
                },
            });

            return tx.verification.create({
                data: {
                    userId,
                    expiredAt,
                    reference,
                    token: hashedToken,
                    type,
                    to: userEmail,
                    createdBy: userId,
                    createdAt,
                },
            });
        });
    }
}
