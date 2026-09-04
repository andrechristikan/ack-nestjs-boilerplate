import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { FirebaseStaleTokenThresholdInDays } from '@common/firebase/constants/firebase.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    Device,
    DeviceOwnership,
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceOwnershipRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    private removeOwnership(
        userId: string,
        deviceOwnershipId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        removedBy: string,
        action: EnumActivityLogAction
    ): Promise<IDeviceOwnership> {
        const today = this.helperDateService.create();

        return this.databaseService.client.deviceOwnership.update({
            where: {
                id: deviceOwnershipId,
                userId,
            },
            data: {
                isRevoked: true,
                revokedAt: today,
                revokedBy: {
                    connect: {
                        id: removedBy,
                    },
                },
                updatedBy: removedBy,
                device: {
                    update: {
                        notificationToken: null,
                        notificationProvider: null,
                        lastActiveAt: today,
                        updatedBy: removedBy,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: {
                                gt: today,
                            },
                            deviceOwnershipId: deviceOwnershipId,
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: today,
                            revokedById: removedBy,
                            updatedBy: removedBy,
                        },
                    },
                },
                user: {
                    update: {
                        activityLogs: {
                            create: {
                                action,
                                description:
                                    this.activityLogUtil.getDescription(action),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
                                createdBy: removedBy,
                            },
                        },
                    },
                },
            },
            include: {
                device: true,
                user: {
                    select: UserRefSelect,
                },
                revokedBy: {
                    select: UserRefSelect,
                },
                _count: {
                    select: {
                        sessions: {
                            where: {
                                isRevoked: false,
                                expiredAt: {
                                    gt: today,
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
        const today = this.helperDateService.create();

        return this.paginationService.offset<
            IDeviceOwnership,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.client.deviceOwnership, {
            ...others,
            where: {
                ...where,
                ...isRevoked,
                userId,
            },
            include: {
                device: true,
                user: {
                    select: UserRefSelect,
                },
                revokedBy: {
                    select: UserRefSelect,
                },
                _count: {
                    select: {
                        sessions: {
                            where: {
                                isRevoked: false,
                                expiredAt: {
                                    gt: today,
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async findActiveWithPaginationCursor(
        userId: string,
        sessionId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>> {
        const today = this.helperDateService.create();

        return this.paginationService.cursor<
            IDeviceOwnershipWithSession,
            Prisma.DeviceOwnershipWhereInput
        >(this.databaseService.client.deviceOwnership, {
            ...others,
            where: {
                ...where,
                userId,
                isRevoked: false,
            },
            include: {
                device: true,
                user: {
                    select: UserRefSelect,
                },
                revokedBy: {
                    select: UserRefSelect,
                },
                _count: {
                    select: {
                        sessions: {
                            where: {
                                isRevoked: false,
                                expiredAt: {
                                    gt: today,
                                },
                            },
                        },
                    },
                },
                sessions: {
                    where: {
                        id: sessionId,
                    },
                    take: 1,
                },
            },
        });
    }

    async findTokensByUserId(
        userId: string
    ): Promise<(DeviceOwnership & { device: Device })[]> {
        return this.databaseService.client.deviceOwnership.findMany({
            where: {
                userId,
                device: {
                    notificationToken: { not: null },
                },
            },
            include: {
                device: true,
            },
        });
    }

    async existActive(
        userId: string,
        deviceOwnershipId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.deviceOwnership.findUnique({
            where: {
                id: deviceOwnershipId,
                userId,
                isRevoked: false,
            },
            select: { id: true },
        });
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        { name, notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeviceRefresh,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDeviceRefresh
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
                deviceOwnerships: {
                    update: {
                        where: {
                            id: deviceOwnershipId,
                        },
                        data: {
                            lastActiveAt: today,
                            device: {
                                update: {
                                    name,
                                    platform,
                                    notificationProvider,
                                    notificationToken,
                                    lastActiveAt: today,
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async remove(
        userId: string,
        deviceOwnershipId: string,
        requestLog: IRequestLog
    ): Promise<IDeviceOwnership> {
        return this.removeOwnership(
            userId,
            deviceOwnershipId,
            requestLog,
            userId,
            EnumActivityLogAction.userRemoveDevice
        );
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        requestLog: IRequestLog
    ): Promise<IDeviceOwnership> {
        return this.removeOwnership(
            userId,
            deviceOwnershipId,
            requestLog,
            removedBy,
            EnumActivityLogAction.userRemoveDevice
        );
    }

    async cleanupTokens(
        userId: string,
        tokens: string[]
    ): Promise<Prisma.BatchPayload> {
        const deviceIds =
            await this.databaseService.client.deviceOwnership.findMany({
                where: {
                    userId,
                    device: {
                        notificationToken: {
                            in: tokens,
                        },
                    },
                },
                select: {
                    deviceId: true,
                },
            });

        const deviceIdList = deviceIds.map(d => d.deviceId);

        return this.databaseService.client.device.updateMany({
            where: {
                id: {
                    in: deviceIdList,
                },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                updatedBy: userId,
            },
        });
    }

    async cleanupStaleTokens(): Promise<Prisma.BatchPayload> {
        const today = this.helperDateService.create();
        const thresholdDate = this.helperDateService.backward(
            today,
            Duration.fromObject({
                days: FirebaseStaleTokenThresholdInDays,
            })
        );

        return this.databaseService.client.device.updateMany({
            where: {
                notificationToken: {
                    not: null,
                },
                lastActiveAt: {
                    lt: thresholdDate,
                },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
            },
        });
    }
}
