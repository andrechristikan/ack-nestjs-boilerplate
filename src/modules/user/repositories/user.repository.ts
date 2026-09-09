import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { TwoFactorActiveBackupCodesFilter } from '@modules/user/constants/user.constant';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.profile.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    IUser,
    IUserContact,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumUserStatus,
    Prisma,
    User,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {}

    async findWithPaginationOffset(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUserList>> {
        return this.paginationService.offset<IUserList, Prisma.UserWhereInput>(
            this.databaseService.client.user,
            {
                ...params,
                where: {
                    ...where,
                    ...status,
                    ...countryId,
                    ...roleId,
                    deletedAt: null,
                },
                include: {
                    role: { include: { policies: true } },
                    twoFactor: {
                        include: {
                            backupCodes: {
                                where: TwoFactorActiveBackupCodesFilter,
                            },
                        },
                    },
                    photo: true,
                },
            }
        );
    }

    async findActive(): Promise<IUserContact[]> {
        return this.databaseService.client.user.findMany({
            where: {
                status: EnumUserStatus.active,
                deletedAt: null,
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async findOneActiveById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                country: true,
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
                photo: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneActiveProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
            include: {
                role: { include: { policies: true } },
                country: true,
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
                photo: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async existByEmail(email: string): Promise<{ id: string } | null> {
        return this.databaseService.client.user.findFirst({
            where: { email: email },
            select: { id: true },
        });
    }

    async existByUsername(username: string): Promise<{ id: string } | null> {
        return this.databaseService.client.user.findUnique({
            where: { username },
            select: { id: true },
        });
    }

    async updateStatusByAdmin(
        id: string,
        { status }: UserUpdateStatusRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        const action =
            status === EnumUserStatus.blocked
                ? EnumActivityLogAction.userBlocked
                : EnumActivityLogAction.userUpdateStatus;
        return this.databaseService.client.user.update({
            where: { id, deletedAt: null },
            data: {
                status,
                updatedBy,
                activityLogs: {
                    create: {
                        action,
                        description:
                            this.activityLogUtil.getDescription(action),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: updatedBy,
                    },
                },
            },
        });
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                ...data,
                countryId,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdateProfile,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdateProfile
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

    async updatePhotoProfile(
        userId: string,
        photo: IAwsS3,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                photo: this.databaseUtil.toPlainObject(photo),
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdatePhotoProfile,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdatePhotoProfile
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

    async deleteSelf(
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const deletedAt = this.helperDateService.create();
        return this.databaseService.client.user.softDelete({
            where: { id: userId, deletedAt: null },
            data: {
                deletedAt,
                status: EnumUserStatus.inactive,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteSelf,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDeleteSelf
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                        createdAt: deletedAt,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: deletedAt },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: deletedAt,
                            revokedById: userId,
                            updatedBy: userId,
                        },
                    },
                },
            },
        }) as Promise<User>;
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                username,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userClaimUsername,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userClaimUsername
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
}
