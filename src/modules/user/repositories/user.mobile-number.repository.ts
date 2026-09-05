import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    Country,
    EnumActivityLogAction,
    UserMobileNumber,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    async findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<{
        id: string;
        number: string;
        phoneCode: string;
        isVerified: boolean;
    } | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                user: {
                    id: userId,
                },
            },
            select: {
                id: true,
                number: true,
                phoneCode: true,
                isVerified: true,
            },
        });
    }

    async existMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId?: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
            where: {
                number,
                countryId,
                phoneCode,
                user: {
                    id: userId,
                },
                ...(excludeId
                    ? {
                          id: { not: excludeId },
                      }
                    : {}),
            },
            select: {
                id: true,
            },
        });
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    create: {
                        countryId,
                        number,
                        phoneCode,
                        createdBy: userId,
                    },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userAddMobileNumber,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userAddMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        countryId,
                        number,
                        phoneCode,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return updated.mobileNumbers[0];
    }

    async updateMobileNumber(
        userId: string,
        mobileNumber: {
            id: string;
            number: string;
            phoneCode: string;
            isVerified: boolean;
        },
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    update: {
                        where: { id: mobileNumber.id },
                        data: {
                            countryId,
                            number,
                            phoneCode,
                            updatedBy: userId,
                            isVerified:
                                mobileNumber.number === number &&
                                mobileNumber.phoneCode === phoneCode
                                    ? mobileNumber.isVerified
                                    : false,
                        },
                    },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdateMobileNumber,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdateMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        id: mobileNumber.id,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return updated.mobileNumbers[0];
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const user = await this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    delete: { id: mobileNumberId },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteMobileNumber,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDeleteMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        id: mobileNumberId,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return user.mobileNumbers[0];
    }
}
