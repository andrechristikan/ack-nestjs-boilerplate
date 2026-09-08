import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumUserStatus,
    EnumVerificationType,
    User,
    Verification,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { IUserVerificationCreate } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
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

    async verify(
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userVerifiedEmail,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userVerifiedEmail
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async verifyEmail(
        id: string,
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Verification> {
        const today = this.helperDateService.create();

        return this.databaseService.client.verification.update({
            where: {
                id,
            },
            data: {
                isUsed: true,
                verifiedAt: today,
                user: {
                    update: {
                        verifiedAt: today,
                        isVerified: true,
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userVerifiedEmail,
                                description:
                                    this.activityLogUtil.getDescription(
                                        EnumActivityLogAction.userVerifiedEmail
                                    ),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
                                createdBy: userId,
                            },
                        },
                    },
                },
            },
        });
    }

    async requestVerificationEmail(
        userId: string,
        userEmail: string,
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();

        return this.databaseService.client.$transaction(async tx => {
            const [_, newVerification] = await Promise.all([
                tx.verification.updateMany({
                    where: {
                        userId,
                        type,
                        isUsed: false,
                        expiredAt: {
                            gt: today,
                        },
                    },
                    data: {
                        expiredAt: today,
                    },
                }),
                tx.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        verifications: {
                            create: {
                                expiredAt,
                                reference,
                                token: hashedToken,
                                type,
                                to: userEmail,
                                createdBy: userId,
                                createdAt: today,
                            },
                        },
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userSendVerificationEmail,
                                description:
                                    this.activityLogUtil.getDescription(
                                        EnumActivityLogAction.userSendVerificationEmail
                                    ),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
                                createdBy: userId,
                            },
                        },
                    },
                }),
            ]);

            return newVerification;
        });
    }
}
