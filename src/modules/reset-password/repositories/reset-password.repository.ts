import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResetPasswordCreate } from '@modules/reset-password/interfaces/reset-password.interface';
import { Injectable } from '@nestjs/common';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_USER_STATUS,
    ResetPassword,
    User,
} from '@prisma/client';

@Injectable()
export class ResetPasswordRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findOneByToken(
        token: string
    ): Promise<(ResetPassword & { user: User }) | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.resetPassword.findFirst({
            where: {
                token,
                isUsed: false,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: ENUM_USER_STATUS.ACTIVE,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async forgot(
        userId: string,
        email: string,
        { expiredAt, reference, token }: IResetPasswordCreate,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        await this.databaseService.user.update({
            where: {
                id: userId,
                deletedAt: null,
                status: ENUM_USER_STATUS.ACTIVE,
            },
            data: {
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_FORGOT_PASSWORD,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                resetPasswords: {
                    updateMany: {
                        where: { isUsed: false },
                        data: { isUsed: true },
                    },
                    create: {
                        expiredAt,
                        reference,
                        token,
                        createdBy: userId,
                        to: email,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        return;
    }
}
