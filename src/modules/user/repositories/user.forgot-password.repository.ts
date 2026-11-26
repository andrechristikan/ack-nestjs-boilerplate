import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { ForgotPassword } from '@generated/prisma-client/client';
import type {
    IUserForgotPassword,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserForgotPasswordRepository } from '@modules/user/interfaces/user.forgot-password-repository.interface';
import { UserForgotPasswordWithUserRecipientInclude } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserForgotPasswordRepository
    extends DatabaseRepositoryBase
    implements IUserForgotPasswordRepository
{
    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {
        super();
    }

    async findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<IUserForgotPassword | null> {
        const today = this.helperDateService.now();

        return this.databaseService.client.forgotPassword.findFirst({
            where: {
                token,
                isUsed: false,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            include: UserForgotPasswordWithUserRecipientInclude,
        });
    }

    async findOneLatestByForgotPassword(
        userId: string
    ): Promise<ForgotPassword | null> {
        return this.databaseService.client.forgotPassword.findFirst({
            where: {
                userId,
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

    async createReplacingUnusedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string,
        { expiredAt, reference, hashedToken }: IUserForgotPasswordCreate
    ): Promise<ForgotPassword> {
        await this.markUnusedUsedByUserInTx(tx, userId, userId);

        return tx.forgotPassword.create({
            data: {
                userId,
                expiredAt,
                reference,
                token: hashedToken,
                createdBy: userId,
                to: email,
            },
        });
    }

    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        resetAt: Date,
        updatedBy: string
    ): Promise<ForgotPassword> {
        try {
            return await tx.forgotPassword.update({
                where: { id: forgotPasswordId, isUsed: false },
                data: {
                    isUsed: true,
                    resetAt,
                    updatedBy,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async markUnusedUsedByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await tx.forgotPassword.updateMany({
            where: { userId, isUsed: false },
            data: { isUsed: true, updatedBy },
        });
    }

    async deleteExpiredBefore(threshold: Date): Promise<number> {
        const { count } =
            await this.databaseService.client.forgotPassword.deleteMany({
                where: { expiredAt: { lt: threshold } },
            });

        return count;
    }
}
