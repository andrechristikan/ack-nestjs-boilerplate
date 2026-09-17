import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { ForgotPassword } from '@generated/prisma-client/client';
import type {
    IUser,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserPasswordRepository } from '@modules/user/interfaces/user.password.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordRepository implements IUserPasswordRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<(ForgotPassword & { user: IUser }) | null> {
        const today = this.helperDateService.create();

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
            include: {
                user: {
                    include: {
                        role: { include: { policies: true } },
                        twoFactor: true,
                    },
                },
            },
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

    async expireUnusedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.forgotPassword.updateMany({
            where: { userId, isUsed: false },
            data: { isUsed: true },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string,
        { expiredAt, reference, hashedToken }: IUserForgotPasswordCreate
    ): Promise<ForgotPassword> {
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
        resetAt: Date
    ): Promise<ForgotPassword> {
        return tx.forgotPassword.update({
            where: { id: forgotPasswordId },
            data: {
                isUsed: true,
                resetAt,
            },
        });
    }
}
